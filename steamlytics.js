"use strict"; 

var request = require('ajax-request');

function getJSON(url, callback) {
	request(url, function(err, resp, data) {
		if(!resp.headers) {
			callback("invalid_response");
			return;
		}
		if(resp.headers.location) {
			getJSON(resp.headers.location, callback);
		} else {
			var callback_arg = {};
			try {
				var d_parsed = JSON.parse(data);
				callback_arg = d_parsed;
			} catch(e) {
				callback_arg = {success: false, message: "There was an error parsing the response from steamlytics, their servers may be down.", exception: e};
			}
			callback(callback_arg);
		}
	});
}
 

/**
 * Constructs a new Steamlytics object used to interact with the Steamlytics API. A test call is made when the object is constructed.
 * @param {string} apiKey The API key used in order to make calls to the Steamlytics API.
 * @param {function(Steamlytics, {api_plan:number, subscription_ends_at:number, calls_this_minute:number, calls_today:number})} readyCallback Callback is run when test call is complete and api is ready to be used, the argument is the api object.
 */
function Steamlytics(apiKey, readyCallback) {
	this.apiKey = apiKey;
	this.apiLevel = 0;
	this.ready = false;
	var csgo = {};

	/**
	 * Gets the account information associated with this API key.
	 * @param {function(SteamlyticsError, Object)} callback The function to be called when the api call is complete.
	 */
	csgo.account = (callback) => {
		getJSON(`http://api.steamlytics.xyz/v1/account?key=${this.apiKey}`, (data) => {
			if(data.success) {
				callback(null, data);
			} else {
				callback(new SteamlyticsError(data.message), {});
			}
		})
	}

	/**
	 * Gets the pro-plan enabled pricelist (V2). If the account tied to the API key does not have pro-plan or higher, this will return an empty array.
	 * 
	 * @param {string} [currency="$"] The currency code used for the api request. The default is 2001 (USD or $). View the list of valid currencies at http://steam.steamlytics.xyz/currencies#currencies
	 * @param {function(SteamlyticsError, Array<Object>)} callback The function to be called when the api call is complete.
	 */
	csgo.pricelist = (currency, callback) => {
		if(typeof currency == 'function') {
			var currencyURL = ``;
			callback = currency;
		} else {
			var currencyURL = `&currency=${currency}`;
		}
		if(this.apiLevel < 2) {
			return callback([]);
		}
		getJSON(`http://api.csgo.steamlytics.xyz/v2/pricelist?key=${this.apiKey}${currencyURL}`, (data) => {
			if(data.success) {
				callback(null, data.items);
			} else {
				callback(new SteamlyticsError(data.message), []);
			}
		});
	}

	/**
	 * Gets the price of a single item.
	 * 
	 * @param {string} market_hash_name The market_hash_name of the item.
	 * @param {object} [options] the additional parameters for the api call. See the API docs at http://csgo.steamlytics.xyz/api for more details. 
	 * @param {function(SteamlyticsError, Array<Object>)} callback the function to be called when the api call is complete. See the API docs at http://csgo.steamlytics.xyz/api for more details.
	 */
	csgo.prices = (market_hash_name, options, callback) => {
		var options_str = "";
		if(typeof options == 'function') {
			callback = options;
		} else {
			if(options.from) {
				options_str += `&from=${options.from}`;
			}
			if(options.to) {
				options_str += `&to=${options.to}`;
			}
			if(options.on) {
					if(options.from || options.to) {
					throw new SteamlyticsError('May not use "from" or "to" in conjunction with "on".');
				}
				options_str += `&on=${options.on}`;
			}
			if(options.currency && this.apiLevel >= 2) {
				options_str += `&currency=${options.currency}`;
			}
		}
		getJSON(`http://api.csgo.steamlytics.xyz/v1/prices/${market_hash_name}?key=${this.apiKey}${options_str}`, (data) => {
			if(data.success) {
				callback(null, data);
			} else {
				callback(new SteamlyticsError(data.message), {});
			}
		});
	}
	/**
	 * Gets a list of all items currently tracked in the Steamlytics database.
	 * 
	 * @param {function(SteamlyticsError, {num_items:number, items:Object[]})} callback the function to be called when the api call is complete. See the api docs at http://csgo.steamlytics.xyz/api for more details.
	 */
	csgo.items = (callback) => {
		getJSON(`http://api.csgo.steamlytics.xyz/v1/items?key=${this.apiKey}`, (data) => {
			if(data.success) {
				callback(null, {num_items: data.num_items, items:data.items});
			} else {
				callback(new SteamlyticsError(data.message), {num_items: 0, items: []});
			}
		});
	}
	/**
	 * Gets the current list of popular items
	 * 
	 * @param {number} [limit] (optional) The limit for how many results to return
	 * @param {function(SteamlyticsError, {rank: number, market_hash_name: string, volume: number}[])} callback The callback for when the API call is complete. See the api docs at http://csgo.steamlytics.xyz/api for more details.
	 */
	csgo.popular = (limit, callback) => {
		var limit_str = ``;
		if(typeof limit == 'function') {
			callback = limit;
		} else {
			limit_str = `&limit=${limit}`;
		}
		getJSON(`http://api.csgo.steamlytics.xyz/v1/items/popular?key=${this.apiKey}${limit_str}`, (data) => {
			if(data.success) {
				callback(null, data.items);
			} else {
				callback(new SteamlyticsError(data.message), []);
			}
		});
	}

	csgo.account((err, data) => {
		if(!err) {
			this.apiLevel = data.api_plan;
			this.ready = true;
			readyCallback(this, data);
		} else {
			throw err;
		}
	})

	this.csgo = csgo;
}


class SteamlyticsError {
	constructor(message) {
		Error.captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
		this.message = message;
	}
}

exports.API = Steamlytics;

exports.SteamlyticsError = SteamlyticsError;
