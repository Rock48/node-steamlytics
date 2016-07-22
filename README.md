# node-steamlytics
A node-js module for http://steamlytics.xyz/

You can install the package via npm using

	npm install node-steamlytics --save

How to use
-----------

It's extremely simple to use node-steamlytics. Every function corresponds with an equivalent API call. For example, if I want to get the price of an AWP | Dragon Lore (Factory New), it's as simple as:

	"use strict";

	var SteamlyticsAPI = require("node-steamlytics").API;
	var steamlytics = new SteamlyticsAPI("myAPIKeyHere", (api, account) => { // function called when API ready
		api.csgo.prices("AWP | Dragon Lore (Factory New)", (data) => {
			console.log(`DLore Price: $${data.median_price}`);
		});
	});

Which, at the time of writing, would output:

	DLore Price: $1252.50

Shitty Documentation
---------------------
	steamlytics.csgo.account(callback) // Gets account information associated with the API key.
	steamlytics.csgo.pricelist(callback, currency) // Gets the /v2/pricelist, see the Steamlytics api reference for currency details. The default is "$". The callback argument is the items array, or an empty array if your API level is not sufficient.
	steamlytics.csgo.prices(market_hash_name, callback, options) // Gets the price of an item, options is an object that may contain parameters for the call. See the API reference for details.
	steamlytics.csgo.items(callback) // Gets the list of items in the database. Callback arguments should be (num_items, items[]). See API reference for details.
	steamlytics.csgo.popular(callback, limit) // Gets popular item list. The callback argument is the array of items