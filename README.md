# Example: Parser Combinators with Express

## Set-up

Ensure you are running Node 8.6.0 or newer.

```bash
#cd into this repo's directory
npm install
#start the example server
node index.js
#an HTTP server will have started at 127.0.0.1:3000
```

## Using the example server

### Overview

The example server exposes two endpoints:

1. `/user/:id`
2. `/user/:id/:action`

If you look at the source code (`index.js`), you will see that the `id` and `action` params have white-listed and black-listed values for different use-cases. The goal of this example is to demonstrate how a developer might enumerate these rules at the framework level, instead of using many conditional statements throughout their application. It is possible to implement more complex white-/black-listing rules than simple enumerations, but that is out of scope for this example.

We define several functions that allow the creation of routes fragment parsers instead of using traditional Express/Sinatra syntax. These functions are:

1. `string`
2. `anyParam`
3. `blackListParam`
4. `whiteListParam`

Also, the `route` function takes an arbitrary number of fragment parsers as arguments to compose a full route parser.

Please see the code for how these functions are used to construct route parsers.

The `handleRoute` function takes a route parser and an Express middleware callback as arguments, and returns a middleware function that can be "used" with an Express app. This middleware function will match against the rules specified in the route parser, and delegate to the supplied callback if the path requested is successfully parsed. Also, on a successful parse, the matched params are attached to the `req` object under the `params` property. If the parse is not successful, the `next` function is called, delegating to subsequently-defined middleware.

This example does not take into account matching routes to different kinds of HTTP methods (e.g. GET, POST...). However, this can be simply implemented in `handleRoute`.

### Routes

The routes defined in this example assume a scenario where three admin users for a web application exist. These admin users have the IDs 0, 1 and 2. Users with other IDs are assumed to be regular, non-admin users.

These routes will respond with the matched params as JSON (status code 200) on a successful parse, or respond with "404 Not Found" if parsing all of the defined routes fails.

#### `readOneUser  /user/:id`

This route takes any ID, regular or admin.

```bash
curl localhost:3000/user/0
# -> { "id": "0" }

curl localhost:3000/user/foobar
# -> { "id": "foobar" }
```

#### `viewUserActionPage  /user/:id/:action`

This route only takes regular user IDs, and `action` must be one of `dashboard`, `invoices`, or `settings`.

```bash
curl localhost:3000/user/0/invoices
# -> Not Found

curl localhost:3000/user/0099af8/dashboard
# -> { "id": "0099af8", "action": "dashboard" }

curl localhost:3000/user/999/settings
# -> { "id": "999", "action": "settings" }

curl localhost:3000/user/0099af8/security
# -> Not Found
```

#### `viewAdminActionPage  /user/:id/:action`

This route only takes admin user IDs, and `action` must be one of `console`, `security`, or `settings`.

```bash
curl localhost:3000/user/012/console
# -> Not Found

curl localhost:3000/user/1/security
# -> { "id": "1", "action": "security" }

curl localhost:3000/user/1/settings
# -> { "id": "1", "action": "settings" }

curl localhost:3000/user/2/invoices
# -> Not Found
```

# Author

Dhruv Dang  
[hi@dhruv.io](mailto:hi@dhruv.io)  
[dhruv.io](https://dhruv.io)
