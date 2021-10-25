require('dotenv').config();

const express = require('express');
const helmet = require('helmet');

const app = express();
const cors = require('cors');
app.use(express.json());
app.use(cors()); // todo: use whitelist
app.use(helmet());

const firebaseAdmin = require('firebase-admin');
const rateLimit = require('express-rate-limit');

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.applicationDefault()
});

const db = firebaseAdmin.firestore();

// init server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});

app.get('/', async (req, res) => {
  res.send('hello degen');
});

/* assumed data structure in firestore
    /nfts
        /nftAddress
            { name, ... }
            /addresses
                /address
                    { address, nftAddress, ... }
*/
app.get('/u/:address', addressRateLimit(), async (req, res) => {
  const address = (`${req.params.address}` || '').trim().toLowerCase();
  if (!address) {
    res.status(400).send('empty address');
    return;
  }
  try {
    const nfts = await db.collectionGroup('addresses').where('address', '==', address).limit(100).get();
    const resp = nfts.docs.map((doc) => doc.data());
    res.send(resp);
  } catch (err) {
    console.error('Error fetching claimable nfts for', address, err);
    res.sendStatus(500);
  }
});

// ================================================ helpers =======================================================

function addressRateLimit() {
  return rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 200, // limit each user's address to 200 requests per windowMs
    keyGenerator: function (req, res) {
      // uses user's address as key for rate limiting
      return req.params.user ? req.params.user.trim().toLowerCase() : '';
    }
  });
}
