#!/bin/bash
# Opened by Terminal at login: keeps the Mail helper running for the Clients app.
cd "$(dirname "$0")" && exec /opt/local/bin/node server.js
