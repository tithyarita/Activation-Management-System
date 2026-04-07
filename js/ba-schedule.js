import { db, collection, query, where, getDocs } from './firebase.js';

export async function loadBASchedule(userId) {
  // Step 1: Get all campaign assignments for this BA
  const assignSnap = await getDocs(query(collection(db, 'campaign_ba_assignments'), where('baId', '==', userId)));
  const campaignIds = [];
  assignSnap.forEach(doc => {
    const d = doc.data();
    if (d.campaignId) campaignIds.push(d.campaignId);
  });
  if (campaignIds.length === 0) return [];
  // Step 2: Fetch campaign details for these IDs
  // Firestore doesn't support 'in' with more than 10 items, so batch if needed
  const campaigns = [];
  for (let i = 0; i < campaignIds.length; i += 10) {
    const batchIds = campaignIds.slice(i, i + 10);
    const q = query(collection(db, 'campaigns'), where('__name__', 'in', batchIds));
    const snap = await getDocs(q);
    snap.forEach(doc => {
      const d = doc.data();
      d.id = doc.id;
      campaigns.push(d);
    });
  }
  return campaigns;
}
