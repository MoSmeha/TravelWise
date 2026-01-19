
import * as jwtStar from 'jsonwebtoken';
import jwtDefault from 'jsonwebtoken';

console.log('Star import keys:', Object.keys(jwtStar));
console.log('Default import keys:', Object.keys(jwtDefault || {}));

try {
    console.log('Star sign type:', typeof jwtStar.sign);
} catch (e) {
    console.log('Star sign error:', e.message);
}

try {
    console.log('Default sign type:', typeof jwtDefault.sign);
} catch (e) {
    console.log('Default sign error:', e.message);
}
