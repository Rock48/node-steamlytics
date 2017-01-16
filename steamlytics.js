"use strict"; 

var request = require('ajax-request');
var Promise = require('bluebird');

function getJSON(url, callback) {
	request(url, function(err, resp, data) {
		if(!resp.headers) 
			return callback("invalid_response");
		
		if(resp.headers.location) 
			return getJSON(resp.headers.location, callback);

		var parsed_data;
		try {
			parsed_data = JSON.parse(data);
		} catch(e) {
			parsed_data = {success: false, message: "There was an error parsing the response from steamlytics, their servers may be down.", exception: e};
		}
		return callback(parsed_data);
	});
}
 

/**
 * Constructs a new Steamlytics object used to interact with the Steamlytics API. A test call is made when the object is constructed.
 * @param {string} apiKey The API key used in order to make calls to the Steamlytics API.
 * @param {function(Steamlytics, {api_plan:number, subscription_ends_at:number, calls_this_minute:number, calls_today:number}, SteamlyticsError)} readyCallback Callback is run when test call is complete and api is ready to be used, the argument is the api object.
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
		return new Promise((resolve, reject) => {
			getJSON(`http://api.steamlytics.xyz/v1/account?key=${this.apiKey}`, (data) => {
				if(data.success) {
					resolve(data);
					return callback(null, data);
				}
				
				var error = new SteamlyticsError(data.message);
				reject(error);
				return callback(error, {});
			});
		});
	}

	/**
	 * Gets the pro-plan enabled pricelist (V2). If the account tied to the API key does not have pro-plan or higher, this will return an empty array.
	 * 
	 * @param {string} [currency="$"] The currency code used for the api request. The default is 2001 (USD or $). View the list of valid currencies at http://steam.steamlytics.xyz/currencies#currencies
	 * @param {function(SteamlyticsError, Array<Object>)} callback The function to be called when the api call is complete.
	 */
	csgo.pricelist = (currency, callback) => {
		return new Promise((resolve, reject) => {
			var isCallbackFirst = typeof currency == 'function' || currency == undefined;

			callback = checkCallback(isCallbackFirst ? currency : callback);

			var error;

			if(this.apiLevel < 2) {
				error = new SteamlyticsError("Pro Plan Required");
				reject(error);
				return callback(error, []);
			}
			
			var currencyURL = isCallbackFirst ? `` : `&currency=${currency}`;


			getJSON(`http://api.csgo.steamlytics.xyz/v2/pricelist?key=${this.apiKey}${currencyURL}`, (data) => {
				if(data.success) {
					resolve(data.items);
					return callback(null, data.items);
				}

				error = new SteamlyticsError(data.message);
				reject(error);
				return callback(error, []);
			});
		});
	}

	/**
	 * Gets the price of a single item.
	 * 
	 * @param {string} market_hash_name The market_hash_name of the item.
	 * @param {object} [options] the additional parameters for the api call. See the API docs at http://csgo.steamlytics.xyz/api for more details. 
	 * @param {function(SteamlyticsError, Object)} callback the function to be called when the api call is complete. See the API docs at http://csgo.steamlytics.xyz/api for more details.
	 */
	csgo.prices = (market_hash_name, options, callback) => {
		return new Promise((resolve, reject) => {
			var options_str = "";

			// cuz fuck `if` statements
			var callbackFirst = typeof options == 'function' || options == undefined;
			
			callback = callbackFirst ? options : callback;
			
			callback = checkCallback(callback);

			options = callbackFirst ? {} : options;

			if(options.from)
				options_str += `&from=${options.from}`;

			if(options.to)
				options_str += `&to=${options.to}`;

			if(options.on) {
				if(options.from || options.to)
					throw new SteamlyticsError('May not use "from" or "to" in conjunction with "on".');

				options_str += `&on=${options.on}`;
			}

			if(options.currency && this.apiLevel >= 2)
				options_str += `&currency=${options.currency}`;
			
			getJSON(`http://api.csgo.steamlytics.xyz/v1/prices/${market_hash_name}?key=${this.apiKey}${options_str}`, (data) => {
				if(data.success) {
					resolve(data);
					return callback(null, data);
				}
				
				var error = new SteamlyticsError(data.message);

				reject(error);
				callback(error, {});
			});
		})
	}
	/**
	 * Gets a list of all items currently tracked in the Steamlytics database.
	 * 
	 * @param {function(SteamlyticsError, {num_items:number, items:Object[]})} callback the function to be called when the api call is complete. See the api docs at http://csgo.steamlytics.xyz/api for more details.
	 */
	csgo.items = (callback) => {
		callback = checkCallback(callback);
		return new Promise((resolve, reject) => {
			getJSON(`http://api.csgo.steamlytics.xyz/v1/items?key=${this.apiKey}`, (data) => {
				if(data.success) {
					resolve({num_items: data.num_items, items:data.items});
					return callback(null, {num_items: data.num_items, items:data.items});
				}
				
				var error = new SteamlyticsError(data.message);
				reject(error);
				return callback(error, {num_items: 0, items: []});
			});
		});
	}
	/**
	 * Gets the current list of popular items
	 * 
	 * @param {number} [limit] (optional) The limit for how many results to return
	 * @param {function(SteamlyticsError, {rank: number, market_hash_name: string, volume: number}[])} callback The callback for when the API call is complete. See the api docs at http://csgo.steamlytics.xyz/api for more details.
	 */
	csgo.items.popular = (limit, callback) => {
		return new Promise((resolve, reject) => {
			var callbackFirst = typeof limit == 'function' || limit == undefined;
			
			callback = checkCallback(callbackFirst ? limit : callback);
			var limit_str = callbackFirst ? `` : `&limit=${limit}`;
			
			getJSON(`http://api.csgo.steamlytics.xyz/v1/items/popular?key=${this.apiKey}${limit_str}`, (data) => {
				if(data.success) {
					resolve(data.items);
					return callback(null, data.items);
				}
				
				error = new SteamlyticsError(data.message);
				reject(error);
				return callback(error, []);
			});
		});
	}

	this.csgo = csgo;

	var steam = {};

	/**
	 * Gets the list of currencies Steamlytics has encountered on the community market
	 * 
	 * @param {function(SteamlyticsError, Object)} callback The callback for when the API call is complete. The returned object is the table of currencies. See the docs at http://steam.steamlytics.xyz/api for details.
	 */
	steam.currencies = (callback) => {
		getJSON(`http://api.steam.steamlytics.xyz/v1/currencies/?key=${this.apiKey}`, (data) => {
			if(data.success)
				return callback(null, data.currencies);
			
			return callback(new SteamlyticsError(data.message), {});
		})
	}

	/**
	 * Returns a table of exchange rates for the current day, based on the base currency ID. The base currency will always be shown in the table with an exchange rate of 1.
	 * 
	 * @param {Object} options The options for the call, see the docs at http://steam.steamlytics.xyz/api for details.
	 * @param {function(SteamlyticsError, Object)} callback The callback for when the API call is complete. The returned object is the table of exchange rates relative to the base. 
	 */
	steam.currencies.latest = (options, callback) => {
		return new Promise((resolve, reject) => {
			var callbackFirst = typeof options == 'function' || options == undefined;
			
			callback = checkCallback(callbackFirst ? options : callback);
			options = callbackFirst ? {} : options;

			var options_str = ``;

			if(options.base)
				options_str += `&base=${options_base}`;

			var error;

			if(options.currencies) {
				if(!options.currencies instanceof Array) {
					error = new SteamlyticsError("options.currencies must be an Array");
					reject(error);
					return callback(error, {}); 
				}
					
				var currenciesStr = "";

				options.currencies.forEach((element, index) => {
					if(index != 0) 
						currenciesStr += ",";
					currenciesStr += element;
				});

				options_str += `&currencies=${currenciesStr}`;
			}

			getJSON(`http://api.steam.steamlytics.xyz/v1/currencies/latest/?key=${this.apiKey}${options_str}`, (data) => {
				if(data.success) {
					resolve(data.rates);
					return callback(null, data.rates);
				}

				error = new SteamlyticsError(data.message);
				
				reject(error);
				return callback(error, {});
			});
		});
	}

	/**
	 * Returns a table of exchange rates for the given date (YYYY-MM-DD), based on the base currency ID. The base currency will always be shown in the table with an exchange rate of 1.
	 * 
	 * This API call is pro plan and up only.
	 * 
	 * @param {Object} options The options for the call, see the docs at http://steam.steamlytics.xyz/api for details.
	 * @param {function(SteamlyticsError, Object)} callback The callback for when the API call is complete. The returned object is the table of exchange rates relative to the base. 
	 */
	steam.currencies.historical = (date, options, callback) => {
		return new Promise((resolve, reject) => {
			var error;
			if(this.apiLevel < 2)  {
				error = new SteamlyticsError("Pro Plan Required");
				reject(error);
				return callback(error, {});
			}

			if(!date.match(/\d{4}-(01|02|03|04|05|06|07|08|09|10|11|12)-(01|02|03|04|05|06|07|08|09|10|11|12|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31)/)) {
				error = new SteamlyticsError("Malformed date, must be in format YYYY-MM-DD");
				reject(error);
				return callback(error, {});
			}

			var callbackFirst = typeof options == 'function' || options == undefined;
			
			callback = checkCallback(callbackFirst ? options : callback);
			options = callbackFirst ? {} : options;

			var options_str = ``;

			if(options.base)
				options_str += `&base=${options_base}`;

			if(options.currencies) {
				if(!options.currencies instanceof Array) {
					error = new SteamlyticsError("options.currencies must be an Array");
					reject(error);
					return callback(error, {});
				}
					
				var currenciesStr = "";

				options.currencies.forEach((element, index) => {
					if(index != 0) 
						currenciesStr += ",";
					currenciesStr += element;
				});

				options_str += `&currencies=${currenciesStr}`;
			}
			getJSON(`http://api.steam.steamlytics.xyz/v1/currencies/historical/${date}?key=${this.apiKey}${options_str}`, (data) => {
				if(data.success) {
					resolve(data.rates);
					return callback(null, data.rates);
				}
				error = new SteamlyticsError(data.message);
				reject(error);
				return callback(error, {});
			});
		});
	}

	/**
	 * Converts an amount from one currency to another. The response will also give you the exchange rate from the first currency to the second currency.
	 * 
	 * @param {number} amount The amount of currency to convert
	 * @param {number|string} from_id The id to convert from
	 * @param {number|string} to_id The id to convert to
	 * @param {function(SteamlyticsError, {amount:number, rate:number})} callback The callback response from this api call. Includes the amount and the rate.
	 */
	steam.currencies.convert = (amount, from_id, to_id, callback) => {
		return new Promise((resolve, reject) => {
			callback = checkCallback(callback);
			if(this.apiLevel < 3) {
				reject(new SteamlyticsError("Enterprise Plan Required"));
				return callback(new SteamlyticsError("Enterprise Plan Required"), {});
			}
			
			getJSON(`http://api.steam.steamlytics.xyz/v1/currencies/convert/${amount}/${from_id}/${to_id}?key=${this.apiKey}`, (data) => {
				if(data.success) {
					resolve({rate: data.rante, amount: data.amount});
					return callback(null, {rate: data.rate, amount: data.amount});
				}
				
				reject(new SteamlyticsError(data.message));
				return callback(new SteamlyticsError(data.message), {});
			})
		});
		
	}
	this.steam = steam;

	csgo.account((err, data) => {
		if(err) {
			readyCallback(null, null, err);
			return;
		}
			
		this.apiLevel = data.api_plan;
		this.ready = true;

		return readyCallback(this, data);
	});
}

/**
 * Used to make sure the callback isn't undefined, returns the callback if it isn't or an empty function if it is.
 * @param {function} callback callback to checkCallback
 */
function checkCallback(callback) {
	if(typeof callback == 'function')
		return callback;
	
	return () => {};
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
