// =======================================
// LOCAL STORAGE CACHE MANAGEMENT
// =======================================

/**
 * Cache keys for localStorage
 */
const CACHE_KEYS = {
    USER: 'ams_user',
    CAMPAIGNS: 'ams_campaigns',
    STAFF: 'ams_staff',
    USERS: 'ams_users',
    CLOCK_RECORDS: 'ams_clock_records',
    BRAND_AMBASSADORS: 'ams_brand_ambassadors',
    CAMPAIGN_BA_ASSIGNMENTS: 'ams_campaign_ba_assignments',
    LEADER_PROFILE: 'ams_leader_profile',
    CACHE_TIMESTAMP: 'ams_cache_timestamp'
};

/**
 * Save user to localStorage after successful login
 */
export function saveUserToCache(userData) {
    try {
        localStorage.setItem(CACHE_KEYS.USER, JSON.stringify(userData));
        localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, new Date().toISOString());
        console.log('✓ User saved to cache');
    } catch (error) {
        console.error('Error saving user to cache:', error);
    }
}

/**
 * Save all Firebase data to localStorage after login
 */
export async function cacheAllData(db, collection, getDocs) {
    try {
        console.log('⏳ Caching all data to localStorage...');
        
        // Cache campaigns
        const campaignsSnap = await getDocs(collection(db, 'campaigns'));
        const campaigns = campaignsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localStorage.setItem(CACHE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
        console.log(`✓ Cached ${campaigns.length} campaigns`);

        // Cache staff
        const staffSnap = await getDocs(collection(db, 'staff'));
        const staff = staffSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localStorage.setItem(CACHE_KEYS.STAFF, JSON.stringify(staff));
        console.log(`✓ Cached ${staff.length} staff members`);

        // Cache users
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localStorage.setItem(CACHE_KEYS.USERS, JSON.stringify(users));
        console.log(`✓ Cached ${users.length} users`);

        // Cache clock records
        const clockSnap = await getDocs(collection(db, 'clock_records'));
        const clockRecords = clockSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localStorage.setItem(CACHE_KEYS.CLOCK_RECORDS, JSON.stringify(clockRecords));
        console.log(`✓ Cached ${clockRecords.length} clock records`);

        // Cache brand ambassadors
        const baSnap = await getDocs(collection(db, 'brand_ambassadors'));
        const brandAmbassadors = baSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localStorage.setItem(CACHE_KEYS.BRAND_AMBASSADORS, JSON.stringify(brandAmbassadors));
        console.log(`✓ Cached ${brandAmbassadors.length} brand ambassadors`);

        // Cache campaign BA assignments
        const assignmentsSnap = await getDocs(collection(db, 'campaign_ba_assignments'));
        const assignments = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        localStorage.setItem(CACHE_KEYS.CAMPAIGN_BA_ASSIGNMENTS, JSON.stringify(assignments));
        console.log(`✓ Cached ${assignments.length} BA assignments`);

        // Update cache timestamp
        localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, new Date().toISOString());
        console.log('✓ All data cached successfully!');

        return true;
    } catch (error) {
        console.error('Error caching data:', error);
        return false;
    }
}

/**
 * Get cached data from localStorage
 */
export function getCachedData(key, defaultValue = null) {
    try {
        const cached = localStorage.getItem(CACHE_KEYS[key]);
        return cached ? JSON.parse(cached) : defaultValue;
    } catch (error) {
        console.error(`Error retrieving cached ${key}:`, error);
        return defaultValue;
    }
}

/**
 * Check if cache exists and is still valid (within 24 hours)
 */
export function isCacheValid() {
    try {
        const timestamp = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
        if (!timestamp) return false;

        const cacheTime = new Date(timestamp).getTime();
        const now = new Date().getTime();
        const cacheAge = now - cacheTime;
        const twentyFourHours = 24 * 60 * 60 * 1000;

        return cacheAge < twentyFourHours;
    } catch (error) {
        console.error('Error checking cache validity:', error);
        return false;
    }
}

/**
 * Get current user from cache
 */
export function getCachedUser() {
    return getCachedData('USER', null);
}

/**
 * Update specific cache (when data changes in app)
 */
export function updateCache(key, data) {
    try {
        localStorage.setItem(CACHE_KEYS[key], JSON.stringify(data));
        console.log(`✓ Updated cache for ${key}`);
    } catch (error) {
        console.error(`Error updating cache for ${key}:`, error);
    }
}

/**
 * Clear all cached data on logout
 */
export function clearAllCache() {
    try {
        Object.values(CACHE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        console.log('✓ All cache cleared on logout');
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

/**
 * Clear specific cache entry
 */
export function clearCache(key) {
    try {
        localStorage.removeItem(CACHE_KEYS[key]);
        console.log(`✓ Cleared cache for ${key}`);
    } catch (error) {
        console.error(`Error clearing cache for ${key}:`, error);
    }
}

/**
 * Get all cached data summary (for debugging)
 */
export function getCacheSummary() {
    try {
        const summary = {};
        Object.entries(CACHE_KEYS).forEach(([key, storageKey]) => {
            const data = localStorage.getItem(storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                summary[key] = Array.isArray(parsed) ? `${parsed.length} items` : typeof parsed;
            }
        });
        return summary;
    } catch (error) {
        console.error('Error getting cache summary:', error);
        return {};
    }
}

/**
 * Load data from cache or Firebase
 * This is a helper function to use in apps with fallback to Firebase
 */
export function loadFromCacheOrFirebase(data, cacheKey, firebaseData) {
    // If cache exists and is valid, use it
    if (isCacheValid()) {
        const cached = getCachedData(cacheKey);
        if (cached) {
            console.log(`✓ Using cached ${cacheKey}`);
            return cached;
        }
    }
    
    // Otherwise use live Firebase data
    console.log(`📡 Using live ${cacheKey} from Firebase`);
    return firebaseData;
}

export default {
    CACHE_KEYS,
    saveUserToCache,
    cacheAllData,
    getCachedData,
    isCacheValid,
    getCachedUser,
    updateCache,
    clearAllCache,
    clearCache,
    getCacheSummary,
    loadFromCacheOrFirebase
};
