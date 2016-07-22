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
		if(!err) {
			console.log(`DLore Price: $${data.median_price}`);
		}
	});
});
```
Which, at the time of writing, would output:
```
DLore Price: $1252.50
```
## Documentation
All function callbacks are formatted as `callback(error, data)`, where `error` is either null (if there's no error) or a throwable instance of `SteamlyticsError` which contains a message about what went wrong with the API call.

### Function reference

```js
steamlytics.csgo.account(callback)
```
Gets account information associated with the API key.
```js
steamlytics.csgo.pricelist([currency], callback)
```
Gets the /v2/pricelist, see the Steamlytics for more details. If you do not supply a currency, it will default to USD. The callback argument is the items array, or an empty array if your API level is not sufficient or an error occurs.
```js
steamlytics.csgo.prices(market_hash_name, [options], callback)
```
Gets the price of an item, options is optional object that may contain parameters for the call. See the API reference for details.
```js
steamlytics.csgo.items(callback)
```
Gets the list of items in the database. Data returned is in the format {num_items, items[]}. See API reference for details.
```js
steamlytics.csgo.popular([limit], callback)
```
Gets popular item list. The callback argument is the array of items. Limit is an optional parameter that limits the data returned.