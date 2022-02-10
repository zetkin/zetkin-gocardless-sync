const axios = require("axios");
const querystring = require("querystring");
const Z = require("zetkin");

module.exports = {
    async initZetkin(config) {
        const scheme = config.ZETKIN_USE_TLS ? "https" : "http";
        const tokenUrl = `${scheme}://api.${config.ZETKIN_DOMAIN}/v1/oauth/token`;
        const reqData = querystring.stringify({
            assertion: config.ZETKIN_GRANT,
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            scope: "level2",
        });

        try {
            const tokenRes = await axios.post(tokenUrl, reqData, {
                auth: {
                    username: config.ZETKIN_CLIENT_ID,
                    password: config.ZETKIN_CLIENT_SECRET,
                },
            });

            const z = Z.construct({
                clientId: config.ZETKIN_CLIENT_ID,
                clientSecret: config.ZETKIN_CLIENT_SECRET,
                zetkinDomain: config.ZETKIN_DOMAIN,
                ssl: config.ZETKIN_USE_TLS,
            });

            z.setTokenData(tokenRes.data);

            return z;
        } catch (err) {
            console.error(err);
            return null;
        }
    },
};
