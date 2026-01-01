
const argon2 = require('argon2');

async function hash() {
    try {
        const hash = await argon2.hash('Avtm!998');
        const fs = require('fs');
        fs.writeFileSync('hash.txt', hash);
        console.log('Written to hash.txt');
    } catch (err) {
        console.error(err);
    }
}

hash();
