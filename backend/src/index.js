import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Post.Ink API running at http://localhost:${PORT}`);
});
