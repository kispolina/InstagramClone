function normalizePhone(value) {
  const compact = value.replace(/[\s().-]/g, '');
  if (/^0\d{9}$/.test(compact)) return '+38' + compact;
  if (/^380\d{9}$/.test(compact)) return '+' + compact;
  return compact;
}
function validPhone(value) { return /^\+[1-9]\d{7,14}$/.test(normalizePhone(value)); }
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
function formatBirthdayInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return digits.slice(0, 4) + '-' + digits.slice(4);
  return digits.slice(0, 4) + '-' + digits.slice(4, 6) + '-' + digits.slice(6);
}
function validBirthday(value, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split('-').map(Number);
  const date = new Date(y,m-1,d);
  if (date.getFullYear()!==y || date.getMonth()!==m-1 || date.getDate()!==d || date>now) return false;
  let age=now.getFullYear()-y;
  if(now.getMonth()<m-1 || (now.getMonth()===m-1 && now.getDate()<d)) age--;
  return age>=13 && age<=120;
}
module.exports={normalizePhone,validPhone,validEmail,formatBirthdayInput,validBirthday};
