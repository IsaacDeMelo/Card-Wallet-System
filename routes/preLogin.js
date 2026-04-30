const express = require('express');
const router = express.Router();

router.get('/home', (req, res) => {
    res.render('home');
});

router.get('/wallet', (req, res) => {
    res.render('wallet');
});

router.get('/admin', (req, res) => {
    res.render('admin');
});

router.get('/admin-lite', (req, res) => {
    res.render('admin-lite');
});

module.exports = router;