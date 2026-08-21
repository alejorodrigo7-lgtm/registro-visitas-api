const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'dr6lkprct',
    api_key: '745268533521125',
    api_secret: 'BTSmbn15PYZbwaQJzpbeZOcaWCc',
});

module.exports = cloudinary;