const {test}=require('node:test');const assert=require('node:assert/strict');
const {normalizePhone,validPhone,validEmail,validBirthday}=require('./validation');
test('Ukrainian local and international phone numbers',()=>{assert.equal(normalizePhone('067 123-45-67'),'+380671234567');assert.ok(validPhone('0671234567'));assert.ok(validPhone('+380 (67) 123-45-67'));assert.equal(validPhone('123'),false);assert.equal(validPhone('+000000000'),false)});
test('email validation',()=>{assert.ok(validEmail('person@example.com'));assert.equal(validEmail('person@'),false)});
test('birthday handles leap dates and exact age boundary',()=>{const now=new Date(2026,9,15);assert.ok(validBirthday('2013-10-15',now));assert.equal(validBirthday('2013-10-16',now),false);assert.equal(validBirthday('2020-02-30',now),false);assert.ok(validBirthday('2000-02-29',now));assert.equal(validBirthday('2099-01-01',now),false)});
