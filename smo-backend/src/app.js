const express = require('express');
const cors = require('cors');

const authRouter = require('./routes/auth');
const questionsRouter = require('./routes/questions');
const answersRouter = require('./routes/answers');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/answers', answersRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

module.exports = app;
