/**
 * Firebase and Firestore have been completely disabled.
 * The system adheres strictly to the requirement:
 * "ห้ามใช้ Database ทุกชนิด... ใช้ Google Sheets เป็นฐานข้อมูลเพียงอย่างเดียว"
 * Architecture: Web App -> Google Apps Script -> Google Sheets
 */

export const db = null as any;
export const auth = null as any;
export default null;
