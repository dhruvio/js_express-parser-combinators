//dependencies
const express = require("express");
const P = require("parsimmon");

//logging helper function
const log = msg => console.log(`[server] ${msg}`);

//parsers

//simple parsers
const slashParser = P.regexp(/\/+/); //one or more slashes
const optionalSlashParser = P.regexp(/\/*/); //zero or more slashes
const paramParser = P.regexp(/[0-9a-zA-Z]+/); //possible param characters, kept this simple for now
//function that matches parsers in sequence,
//and yields the match of the final parser
const seqMapLast = (...parsers) => {
  parsers.push((...results) => results[results.length - 1]);
  return P.seqMap(...parsers);
};

//fragments (to parse from routes)
//parse a 1-to-1 string match
const string = s => seqMapLast(slashParser, P.string(s));
//parse a param that can have any value
const anyParam = (name, parser = paramParser) => [name, seqMapLast(slashParser, parser)];
//white list possible values for a param
const whiteListParam = (name, allowedValues) => [name, P.alt(...allowedValues.map(v => string(v)))];
//black list possible values for a param
const blackListParam = (name, deniedValues) => {
  return [
    name,
    seqMapLast(
      slashParser,
      //ensure the parser fails if the param value is a black-listed one
      //otherwise, succeed with the value of the param
      paramParser
        .chain(v => {
          const isBlackListed = deniedValues.reduce((acc, dv) => acc || v === dv, false);
          if (isBlackListed) {
            return P.fail("Black-listed param");
          } else {
            return P.succeed(v);
          }
        })
    )
  ];
};

//route (alias P.seqObj)
const route = (...fragments) => {
  //add optional trailing slash
  fragments.push(optionalSlashParser);
  //expect to parse route completely
  fragments.push(P.eof);
  //create parser from url fragments
  //that yields an object of parameters
  return P.seqObj(...fragments);
}

//middleware generator to handle routing using parsers
const handleRoute = (parser, onSuccessfulParse) => {
  return (req, res, next) => {
    const result = parser.parse(req.url);
    //cache the parseResult on the request in case this needs to be debugged
    req.parseResult = result;
    //if the parse was successful...
    if (result.status === true) {
      //...set the params on the request object
      req.params = result.value;
      //call the onSuccessfulParse callback
      //which can access the route params with req.params
      onSuccessfulParse(req, res, next);
    } else {
      //if the parse fails,
      //simply move on to the next middleware function
      //NOTE: you could add more parse failure logic here if desired
      next();
    }
  };
};

//set up express app
const app = express();

//create parsers for admin and non-admin IDs
//in this example, we assume we are building routes
//for users that may have a pre-defined admin ID
//and for users that are not admins.
const adminIds = ["0", "1", "2"];
const adminOnlyIdParam = whiteListParam("id", adminIds);
const nonAdminIdParam = blackListParam("id", adminIds);
const anyUserIdParam = anyParam("id");

//routes (made from parsers)

//readOneUser expects routes like this:
//  /user/:id
const readOneUser = route(
  string("user"),
  anyUserIdParam //any user can view this route
);

//viewUserActionPage expects routes like this:
//  /user/:id/:action
//NOTE: this can be abstracted further to re-use readOneUser,
//      but, given the scope of this example, that abstraction is not made.
const viewUserActionPage = route(
  string("user"),
  nonAdminIdParam, //only regular users can view these pages
  whiteListParam("action", ["dashboard", "invoices", "settings"])
);

//viewAdminActionPage expects routes like this:
//  /user/:id/:action
const viewAdminActionPage = route(
  string("user"),
  adminOnlyIdParam, //only admin users can view these pages
  whiteListParam("action", ["console", "security", "settings"])
);

//handle routes in the express app

//helper to respond to request with params object as json
const respondWithParams = (req, res) => res.json(req.params);

//bind routes to express app
[
  readOneUser,
  viewUserActionPage,
  viewAdminActionPage
].forEach(routeParser => {
  //you would provide custom route handlers instead of respondWithParams
  //to handle the necessary business logic and construct a response.
  //we simply respond with the params as JSON in this example.
  const middleware = handleRoute(routeParser, respondWithParams);
  app.use(middleware);
});

//if non-registered route or param parsing fails,
//respond with 404
app.use((req, res) => res.status(404).send("Not Found"));

//listen on localhost at port 3000
//(or whatever is specified by the PORT env variable)
const port = Number(process.env.PORT) || 3000;
app.listen(port);
log(`listening at 127.0.0.1:${port}`);
