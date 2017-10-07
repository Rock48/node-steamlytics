# node-steamlytics
A node.js module for http://steamlytics.xyz/

[![NPM](https://nodei.co/npm/node-steamlytics.png?downloads&downloadRank&stars)](https://nodei.co/npm/node-steamlytics/)

You can install the package via npm using
```
npm install node-steamlytics --save
```
## How to use

It's extremely simple to use node-steamlytics. Every function corresponds with an equivalent API call. For example, if I want to get the price of an AWP | Dragon Lore (Factory New), it's as simple as:
```js
"use strict";

var SteamlyticsAPI = require("node-steamlytics").API;
var steamlytics = new SteamlyticsAPI("myAPIKeyHere", (api, account) => { // function called when API ready
	api.csgo.prices("AWP | Dragon Lore (Factory New)", (err, data) => {
		if(!err) 
			console.log(`DLore Price: $${data.median_price}`);
	});
});
```
Which, at the time of writing, would output:
```
DLore Price: $1252.50
```
## Documentation
All function callbacks are formatted as `callback(error, data)`, where `error` is either null (if there's no error) or a throwable instance of `SteamlyticsError` which contains a message about what went wrong with the API call.
The module also supports promises, so callbacks are optional. The example above can be re-written as
```js
"use strict";

var SteamlyticsAPI = require("node-steamlytics").API;
var steamlytics = new SteamlyticsAPI("myAPIKeyHere", (api, account, error) => { // the constructor does not support promises, for obvious reasons.
	if(error) return; // handle error
	api.csgo.prices("AWP | Dragon Lore (Factory New)").then((data) => {
		console.log(`DLore Price: $${data.median_price}`);
	}).error((err) => {
		// Handle error	
	};
});
```

### Function reference

#### Steamlytics:CSGO

```js
steamlytics.csgo.account(callback);
```
Gets account information associated with the API key. Includes `api_plan`, which is your plan level 0 being free, 1 being developer, 2 being pro, 3 being enterprise. `subscription_ends_at`, which is a unix timestamp for when your subscription ends. It also returns `calls_this_minute` and `calls_this_day` which should explain themselves.
```js
steamlytics.csgo.pricelist([currency], callback);
```
Gets the /v2/pricelist, see the Steamlytics for more details. If you do not supply a currency, it will default to USD. This returns the array of items from the pricelist, or an empty array if your API level is not sufficient or an error occurs.
```js
steamlytics.csgo.prices(market_hash_name, [options], callback);
```
Gets the price of an item, options is optional object that may contain parameters for the call. See the API reference for details. This returns exactly what the API call returns.
```js
steamlytics.csgo.items(callback);
```
Gets the list of items in the database. Data returned is in the format {num_items, items[]}. See API reference for details.
```js
steamlytics.csgo.items.popular([limit], callback);
```
Gets popular item list. This only returns the array of items. Limit is an optional parameter that limits the data returned.

#### Steamlytics:Steam

```js
steamlytics.steam.currencies(callback);
```
Gets the list of currencies Steamlytics has encountered on the community market. The returned object is the table of currencies.
```js
steamlytics.steam.currencies.latest([options], callback);
```
Returns a table of exchange rates for the current day. The base currency will always be shown in the table with an exchange rate of 1. The returned object is the table of exchange rates relative to the base.
```js
steamlytics.steam.currencies.historical(date, [options], callback);
```
The same as `.latest()` but instead returns a table of exchange rates for the given date (YYYY-MM-DD). The returned object is the table of exchange rates relative to the base. This function requires the pro plan.
```js
steamlytics.steam.currencies.convert(amount, from_id, to_id, callback);
```
Converts an amount from one currency to another. The response will also give you the exchange rate from the first currency to the second currency. The result is formatted as so: `{rate:420, amount:1337}`. This function requires the enterprise plan.