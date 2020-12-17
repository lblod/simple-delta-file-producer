import { app, errorHandler } from 'mu';
import bodyParser from 'body-parser';
import DeltaFile from './lib/delta-file.js';
import { APP_NAME, LOG_INCOMING_DELTA, LOG_OUTGOING_DELTA } from './lib/config';
import { enrichDeltaFile } from './lib/producer';

// --- CONFIGURATION ---

// delta notifier can receive and send-out payloads to a size up to 500mb
app.use(bodyParser.json({
  limit: '500mb',
  type: function(req) {
    return /^application\/json/.test(req.get('content-type'));
  },
}));

// --- REST API ---

app.get('/', function(req, res) {
  const hello = `Hey, you have reached "${APP_NAME}"! Seems like I'm doing just fine! ^_^`;
  res.send(hello);
});

app.post('/delta', async function(req, res) {
  const file = new DeltaFile(req);
  if (LOG_INCOMING_DELTA)
    console.log(`Receiving delta ${JSON.stringify(file.delta)}`);

  await enrichDeltaFile(file);
  if(!file.isEmpty) {
    if (LOG_OUTGOING_DELTA) {
      console.log(`Outgoing delta ${JSON.stringify(file.delta)}`);
    }
    await file.writeToDisk();
  } else {
    console.log("Delta did not contain any triples of interest, nothing saved to disk.")
  }

  res.status(202).send();
});

app.get('/files', async function(req, res) {
  const since = req.query.since || new Date().toISOString();
  const files = await DeltaFile.getDeltaFiles(since);
  res.json({data: files});
});

app.use(errorHandler);