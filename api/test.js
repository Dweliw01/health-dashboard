module.exports = (req, res) => {
    res.status(200).json({
        ok: true,
        message: 'API is working',
        hasToken: !!process.env.BLOB_READ_WRITE_TOKEN
    });
};
