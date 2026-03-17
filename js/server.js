const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json'); // Download from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', email).get();

  if (snapshot.empty) return res.status(401).json({ error: 'Invalid email or password' });

  const userDoc = snapshot.docs[0];
  const userData = userDoc.data();

  if (!userData.password) return res.status(401).json({ error: 'No password set' });

  const match = bcrypt.compareSync(password, userData.password);
  if (!match) return res.status(401).json({ error: 'Invalid email or password' });

  // You can return a JWT or session info here
  res.json({
    id: userDoc.id,
    name: userData.name,
    role: userData.role
  });
});

app.listen(3000, () => console.log('Server running on port 3000'));