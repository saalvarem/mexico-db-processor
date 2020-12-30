# Mexico Covid Database Processor

## Description

This personal project is a service that automatically checks for updates from Mexico's national database and processes them to be more easily accessible to humans and people who might want to analyze the data.

The Mexican government and the national Health Department provide a publicly-accessible database with stats regarding the cases of Covid19 in the country.

The information can accessed here: https://www.gob.mx/salud > "Documentos" > "Datos Abiertos"

However, the data is exported in a large CSV file that is updated nightly and compressed into a ZIP file.

The data contained in the exported CSV file is also encoded to numeric values in most cases. The dictionary to map those values/fields to the human-readable definition is also provided, in separate CSV files in that page.

## Database Updater

This service has **2 main components**:

- A `database updater`: a recurring script (or "cron job") that periodically polls the national database for the most up-to-date information. This script also creates files with summarized information from the latest updates that are considerably smaller than the entire database export.
- A simple `server`: a trivial web server (express) that serves static files created by the database updater:

  http://www.covidmxapi.com/mx-totals-by-location.json <-- only available now, but I might develop a full API in the future

The `database updater` is a simple script that is meant to be called once every 8-24 hrs and performs the following actions in order:

1. Download the most-up-to-date ZIP archive containing a database export from Mexico's national Health Service.
2. Extract the CSV file in the ZIP to a temporary location.
3. Map the case records into JSON objects with easier-to-understand descriptions based on the mapping I derived from the dictionaries/catalogs provided by the Mexican Health Service.
   - Currently, the only processing applied to the case records is to group the individual records by totals by location > case result > date. This is output to a file called `mx-totals-by-location.json`
   - The 3.5+ million case records in the CSV file are processed one at a time to avoid running into limits with computer memory.
4. Copy the updated `mx-totals-by-location.json` file to the public folder from where static files are served.
5. Clean up and delete any temporary files created to avoid running into limits with computer storage.
6. If there are during the update process, the service will alert me via SMS and send an email with the details of the error; and it will stop trying to run the "update" process every 8-24 hrs, but I will continue to serve the static files with the last version created.
7. The simple express `server` for this service is simply set up to return a status object of the last update run, and serve (automatically updated) files from a public folder.
8. The summarized version of the database totals can then be consumed by other applications/presentation layers such as this website:
   - www.covidmx.net : A static website I created to present the data from the `mx-totals-by-location.json` file.

# Deployment

The service is dockerized and the container is then deployed to a Virtual Machine micro instance created on Google Cloud Platform's Compute Engine.

# Development

If you want to improve this project, feel free to clone it and develop. I suggest the following instructions to get the development environment up and running:

```
cd ${workdir}
npm i
npm run nodemom
```

# Configuration

The service requires the following `environment variables` a minimum configuration:

```
Required
MEXICO_DB_URL // the url of the ZIP file containing the nightly database export (email me if you're having trouble finding it at the link provided above)
```

```
Optional
NODE_ENV
MONGO_CONN_STRING // "w.i.p." a connection URL for a Mongo DB I want to use to keep track of all the individual "processed" records

FROM_EMAIL_SERVICE // config required by the "nodemailer" module I use for email alerts
FROM_EMAIL // the email used by the service to send out emails
FROM_EMAIL_PASSWORD // the password for the email used by the service
ALERT_EMAIL // the email that should be alerted of errors

FROM_PHONE // the (E164-formatted) phone used by the service to send out SMS messages
ALERT_PHONE // the phone that should be alerted of errors

TWILIO_ACCOUNT_SID // config required by the "twilio" module I use for SMS alerts
TWILIO_AUTH_TOKEN // config required by the "twilio" module
```

# Future Work

I started to add another processor to the database case records and create a proper database that can be accessed through a proper API (made with an express server using Auth0 authentication); but this is a personal project and development is done "when I have time".
