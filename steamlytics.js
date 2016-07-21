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
			try {
				var d_parsed = JSON.parse(data);
				callback(d_parsed);
			} catch(e) {
				callback({success: false, message: "There was an error parsing the response from steamlytics, their servers may be down.", exception: e});
			}
		}
	});
}

/** 
 * A class used to interact with the steamlytics API. Currently supports csgo.steamlytics.xyz, support for steam.steamlytics.xyz is planned.
 */
class Steamlytics {
	/**
	 * Constructs a new Steamlytics object used to interact with the Steamlytics API. A test call is made when the object is constructed.
	 * @param {string} apiKey The API key used in order to make calls to the Steamlytics API.
	 * @param {function(Steamlytics, {api_plan:number, subscription_ends_at:number, calls_this_minute:number, calls_today:number})} readyCallback Callback is run when test call is complete and api is ready to be used, the argument is the api object.
	 */
	constructor(apiKey, readyCallback) {
		this.apiKey = apiKey;
		this.apiLevel = 0;
		this.ready = false;
		this.account((data) => {
			this.apiLevel = data.api_plan;
			this.ready = true;
			readyCallback(this, data);
		})
	}

	/**
	 * Gets the account information associated with this API key.
	 * @param {function({api_plan:number, subscription_ends_at:number, calls_this_minute:number, calls_today:number})} callback The function to be called when the api call is complete.
	 */
	account(callback) {
		getJSON(`http://api.steamlytics.xyz/v1/account?key=${this.apiKey}`, (data) => {
			if(data.success) {
				callback(data);
			} else {
				throw new SteamlyticsError(data.message);
			}
		})
	}

	/**
	 * Gets the pro-plan enabled pricelist (V2). If the account tied to the API key does not have pro-plan or higher, this will return an empty array.
	 * 
	 * @param {function({name:string, safe_price:string, safe_net_price: string, ongoing_price_manipulation: boolean, total_volume: number, "7_days":{median_price: string, median_net_price: string, average_price: string, average_net_price: string, lowest_price: string, lowest_net_price: string, highest_price: string, highest_net_price: string, mean_absolute_deviation: string, deviation_percentage: number, trend: number, volume: number}, "30_days":{median_price: string, median_net_price: string, average_price: string, average_net_price: string, lowest_price: string, lowest_net_price: string, highest_price: string, highest_net_price: string, mean_absolute_deviation: string, deviation_percentage: number, trend: number, volume: number}, "all_time":{median_price: string, median_net_price: string, average_price: string, average_net_price: string, lowest_price: string, lowest_net_price: string, highest_price: string, highest_net_price: string, mean_absolute_deviation: string, deviation_percentage: number, trend: number, volume: number}, first_seen: number}[])} callback The function to be called when the api call is complete.
	 * @param {string} [currency="$"] The currency code used for the api request. The default is 2001 (USD or $). View the list of valid currencies at http://steam.steamlytics.xyz/currencies#currencies
	 */
	pricelist(callback, currency) {
		if(!currency) {
			var currencyURL = ``;
		} else {
			var currencyURL = `&currency=${currency}`;
		}

		if(this.apiLevel < 2) {
			return callback([]);
		}

		getJSON(`http://api.csgo.steamlytics.xyz/v2/pricelist?key=${this.apiKey}${currencyURL}`, (data) => {
			if(data.success) {
				callback(data.items);
			} else {
				console.error(data.message);
				callback([]);
			}
		});
	}

	/**
	 * Gets the price of a single item.
	 * 
	 * @param {string} market_hash_name The market_hash_name of the item.
	 * @param {function({success: boolean, median_price: string, median_net_price: string, average_price: string, average_net_price: string, lowest_price: string, lowest_net_price: string, highest_price: string, highest_net_price: string, mean_absolute_deviation: string, deviation_percentage: number, volume: number, first_seen: number})} callback the function to be called when the api call is complete. The only parameter should be an array of items. See the API docs at http://csgo.steamlytics.xyz/api for more details.
	 * @param {object} [options] the additional parameters for the api call. See the API docs at http://csgo.steamlytics.xyz/api for more details. 
	 */
	prices(market_hash_name, callback, options) {
		if(!options) {
			options = {};
		}

		var options_str = "";

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

		getJSON(`http://api.csgo.steamlytics.xyz/v1/prices/${market_hash_name}?key=${this.apiKey}${options_str}`, (data) => {
			if(!data.success) {
				console.error(data.message);
			}
			callback(data);
		});
	}

	/**
	 * Gets a list of all items currently tracked in the Steamlytics database.
	 * 
	 * @param {function(number, {market_name: string, market_hash_name: string, icon_url: string, name_color: string, quality_color: string}[])} callback the function to be called when the api call is complete. See the api docs at http://csgo.steamlytics.xyz/api for more details.
	 */
	items(callback) {
		getJSON(`http://api.csgo.steamlytics.xyz/v1/items?key=${this.apiKey}`, (data) => {
			if(data.success) {
				callback(data.num_items, data.items);
			} else {
				console.log(data.message);
				callback(0, []);
			}
		});
	}

	/**
	 * Gets the current list of popular items
	 * 
	 * @param {function({rank: number, market_hash_name: string, volume: number})} callback The callback for when the API call is complete. See the api docs at http://csgo.steamlytics.xyz/api for more details.
	 * @param {number} [limit] (optional) The limit for how many results to return
	 */
	popular(callback, limit) {
		if(!limit) {
			limit = 0;
		}
		if(limit > 0) {
			var limit_str = `&limit=${limit}`;
		} else {
			var limit_str = ``;
		}

		getJSON(`http://api.csgo.steamlytics.xyz/v1/items/popular?key=${this.apiKey}${limit_str}`, (data) => {
			if(data.success) {
				callback(data.items);
			} else {
				console.error(data.message);
				callback([]);
			}
		});
	}
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
