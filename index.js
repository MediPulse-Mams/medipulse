const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route principale
app.get('/', (req, res) => {
  res.send('MediPulse API fonctionne ! 🚀');
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`✅ MediPulse tourne sur http://localhost:${PORT}`);
});