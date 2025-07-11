const express = require('express');
const app = express();
const port = 5000;

app.get('/', (req, res) => {
  res.send('Test server is running!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Test server listening on 0.0.0.0:${port}`);
});