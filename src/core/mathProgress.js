(function (root) {
    const STORAGE_KEY = "mathGravity.learningProgress.v1";
    const PROFILE_STORAGE_KEY = "mathGravity.learningProfiles.v1";
    const ACTIVE_PROFILE_KEY = "mathGravity.activeProfile.v1";
    const DEFAULT_PROFILE_ID = "hija";
    const DEFAULT_PROFILES = [
        { id: "hija", name: "Isabella", role: "player" },
        { id: "dev", name: "Desarrollador", role: "developer" }
    ];
    const VERSION = 1;

    function createEmptyProgress() {
        return {
            version: VERSION,
            totals: {
                attempts: 0,
                correct: 0,
                errors: 0
            },
            facts: {}
        };
    }

    function factKey(a, b) {
        return `${a}x${b}`;
    }

    function toPositiveInteger(value) {
        const number = Number(value);
        return Number.isInteger(number) && number > 0 ? number : null;
    }

    function toSafeMethod(method) {
        const clean = (method || "coin").toString().trim().toLowerCase();
        return clean || "coin";
    }

    function toIsoDate(value, fallbackDate) {
        const date = value ? new Date(value) : fallbackDate;
        if (Number.isNaN(date.getTime())) return fallbackDate.toISOString();
        return date.toISOString();
    }

    function normalizeResponseMs(value) {
        const number = Number(value);
        return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
    }

    function normalizeProfileId(profileId) {
        const clean = (profileId || DEFAULT_PROFILE_ID).toString().trim().toLowerCase();
        return clean
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9_-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") || DEFAULT_PROFILE_ID;
    }

    function normalizeProfile(profile) {
        const id = normalizeProfileId(profile && profile.id);
        let name = (profile && profile.name ? profile.name : id).toString().trim() || id;
        if (id === "hija" && name === "Hija") name = "Isabella";
        const role = (profile && profile.role ? profile.role : "player").toString().trim() || "player";
        return { id, name, role };
    }

    function getProgressStorageKey(profileId) {
        return `${STORAGE_KEY}.profile.${normalizeProfileId(profileId)}`;
    }

    function normalizeAttempt(attempt, now = new Date()) {
        const a = toPositiveInteger(attempt && attempt.a);
        const b = toPositiveInteger(attempt && attempt.b);
        if (!a || !b) return null;

        return {
            a,
            b,
            correct: Boolean(attempt.correct),
            responseMs: normalizeResponseMs(attempt.responseMs),
            mode: attempt.mode === undefined ? null : Number(attempt.mode),
            method: toSafeMethod(attempt.method),
            answer: attempt.answer === undefined || attempt.answer === null ? null : attempt.answer,
            attemptedAt: toIsoDate(attempt.attemptedAt, now)
        };
    }

    function createFactStats(a, b) {
        return {
            a,
            b,
            total: 0,
            correct: 0,
            errors: 0,
            accuracy: 0,
            averageResponseMs: null,
            responseCount: 0,
            lastAttemptAt: null,
            lastCorrectAt: null,
            lastErrorAt: null,
            correctStreak: 0,
            errorStreak: 0,
            methods: {},
            wrongAnswers: {}
        };
    }

    function cloneProgress(progress) {
        return JSON.parse(JSON.stringify(progress || createEmptyProgress()));
    }

    function normalizeProgress(progress) {
        const normalized = createEmptyProgress();
        const facts = progress && progress.facts ? progress.facts : {};

        Object.keys(facts).forEach(key => {
            const source = facts[key];
            const a = toPositiveInteger(source && source.a);
            const b = toPositiveInteger(source && source.b);
            if (!a || !b) return;

            const fact = createFactStats(a, b);
            fact.total = Math.max(0, Number(source.total) || 0);
            fact.correct = Math.max(0, Number(source.correct) || 0);
            fact.errors = Math.max(0, Number(source.errors) || 0);
            fact.accuracy = fact.total > 0 ? fact.correct / fact.total : 0;
            fact.averageResponseMs = normalizeResponseMs(source.averageResponseMs);
            fact.responseCount = Math.max(0, Number(source.responseCount) || (fact.averageResponseMs === null ? 0 : fact.total));
            fact.lastAttemptAt = source.lastAttemptAt || null;
            fact.lastCorrectAt = source.lastCorrectAt || null;
            fact.lastErrorAt = source.lastErrorAt || null;
            fact.correctStreak = Math.max(0, Number(source.correctStreak) || 0);
            fact.errorStreak = Math.max(0, Number(source.errorStreak) || 0);
            fact.methods = Object.assign({}, source.methods || {});
            fact.wrongAnswers = Object.assign({}, source.wrongAnswers || {});

            normalized.facts[factKey(a, b)] = fact;
            normalized.totals.attempts += fact.total;
            normalized.totals.correct += fact.correct;
            normalized.totals.errors += fact.errors;
        });

        return normalized;
    }

    function reduceProgress(progress, attempt, now = new Date()) {
        const normalizedAttempt = normalizeAttempt(attempt, now);
        const next = normalizeProgress(cloneProgress(progress));
        if (!normalizedAttempt) return next;

        const key = factKey(normalizedAttempt.a, normalizedAttempt.b);
        const fact = next.facts[key] || createFactStats(normalizedAttempt.a, normalizedAttempt.b);
        const previousResponseCount = fact.responseCount;

        fact.total += 1;
        fact.lastAttemptAt = normalizedAttempt.attemptedAt;
        fact.methods[normalizedAttempt.method] = (fact.methods[normalizedAttempt.method] || 0) + 1;

        if (normalizedAttempt.responseMs !== null) {
            if (previousResponseCount <= 0) {
                fact.averageResponseMs = normalizedAttempt.responseMs;
            } else {
                fact.averageResponseMs = Math.round(
                    ((fact.averageResponseMs * previousResponseCount) + normalizedAttempt.responseMs) /
                    (previousResponseCount + 1)
                );
            }
            fact.responseCount += 1;
        }

        if (normalizedAttempt.correct) {
            fact.correct += 1;
            fact.lastCorrectAt = normalizedAttempt.attemptedAt;
            fact.correctStreak += 1;
            fact.errorStreak = 0;
            next.totals.correct += 1;
        } else {
            fact.errors += 1;
            fact.lastErrorAt = normalizedAttempt.attemptedAt;
            fact.errorStreak += 1;
            fact.correctStreak = 0;
            next.totals.errors += 1;

            if (normalizedAttempt.answer !== null) {
                const answerKey = normalizedAttempt.answer.toString();
                fact.wrongAnswers[answerKey] = (fact.wrongAnswers[answerKey] || 0) + 1;
            }
        }

        fact.accuracy = fact.total > 0 ? fact.correct / fact.total : 0;
        next.facts[key] = fact;
        next.totals.attempts += 1;

        return next;
    }

    function getStorage(options) {
        if (options && options.storage) return options.storage;
        return root && root.localStorage ? root.localStorage : null;
    }

    function loadProfiles(options = {}) {
        const storage = getStorage(options);
        if (!storage) return DEFAULT_PROFILES.map(normalizeProfile);

        try {
            const raw = storage.getItem(PROFILE_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : DEFAULT_PROFILES;
            const seen = {};
            const profiles = parsed
                .map(normalizeProfile)
                .filter(profile => {
                    if (seen[profile.id]) return false;
                    seen[profile.id] = true;
                    return true;
                });
            return profiles.length > 0 ? profiles : DEFAULT_PROFILES.map(normalizeProfile);
        } catch (e) {
            return DEFAULT_PROFILES.map(normalizeProfile);
        }
    }

    function saveProfiles(profiles, options = {}) {
        const storage = getStorage(options);
        const seen = {};
        const normalized = (profiles || [])
            .map(normalizeProfile)
            .filter(profile => {
                if (seen[profile.id]) return false;
                seen[profile.id] = true;
                return true;
            });
        const next = normalized.length > 0 ? normalized : DEFAULT_PROFILES.map(normalizeProfile);

        if (storage) storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
        return next;
    }

    function getActiveProfileId(options = {}) {
        const storage = getStorage(options);
        const profiles = loadProfiles(options);
        const fallback = profiles[0] ? profiles[0].id : DEFAULT_PROFILE_ID;
        if (!storage) return fallback;

        const stored = normalizeProfileId(storage.getItem(ACTIVE_PROFILE_KEY));
        return profiles.some(profile => profile.id === stored) ? stored : fallback;
    }

    function setActiveProfileId(profileId, options = {}) {
        const storage = getStorage(options);
        const normalizedId = normalizeProfileId(profileId);
        const profiles = loadProfiles(options);
        const nextId = profiles.some(profile => profile.id === normalizedId)
            ? normalizedId
            : (profiles[0] ? profiles[0].id : DEFAULT_PROFILE_ID);

        if (storage) storage.setItem(ACTIVE_PROFILE_KEY, nextId);
        if (root) root.ACTIVE_PROFILE_ID = nextId;
        return nextId;
    }

    function addProfile(profile, options = {}) {
        const profiles = loadProfiles(options);
        const normalized = normalizeProfile(profile);
        const existingIndex = profiles.findIndex(item => item.id === normalized.id);
        if (existingIndex >= 0) profiles[existingIndex] = normalized;
        else profiles.push(normalized);
        return saveProfiles(profiles, options);
    }

    function loadProgress(options = {}) {
        const storage = getStorage(options);
        if (!storage) return createEmptyProgress();

        try {
            const raw = storage.getItem(getProgressStorageKey(options.profileId || getActiveProfileId(options)));
            return raw ? normalizeProgress(JSON.parse(raw)) : createEmptyProgress();
        } catch (e) {
            return createEmptyProgress();
        }
    }

    function saveProgress(progress, options = {}) {
        const storage = getStorage(options);
        const normalized = normalizeProgress(progress);
        if (!storage) return normalized;

        storage.setItem(getProgressStorageKey(options.profileId || getActiveProfileId(options)), JSON.stringify(normalized));
        return normalized;
    }

    function recordAttempt(attempt, options = {}) {
        const now = options.now || new Date();
        const profileId = options.profileId || (attempt && attempt.profileId);
        const storageOptions = Object.assign({}, options, { profileId });
        const progress = loadProgress(storageOptions);
        const next = reduceProgress(progress, attempt, now);
        return saveProgress(next, storageOptions);
    }

    function exportProgressJson(progress, options = {}) {
        return JSON.stringify(normalizeProgress(progress || loadProgress(options)), null, 2);
    }

    function importProgressJson(json, options = {}) {
        const parsed = JSON.parse(json);
        return saveProgress(normalizeProgress(parsed), options);
    }

    function getFactStats(progress, a, b) {
        const normalized = normalizeProgress(progress);
        return normalized.facts[factKey(a, b)] || createFactStats(a, b);
    }

    const api = {
        STORAGE_KEY,
        PROFILE_STORAGE_KEY,
        ACTIVE_PROFILE_KEY,
        DEFAULT_PROFILE_ID,
        DEFAULT_PROFILES,
        VERSION,
        createEmptyProgress,
        factKey,
        normalizeProfileId,
        normalizeProfile,
        getProgressStorageKey,
        loadProfiles,
        saveProfiles,
        addProfile,
        getActiveProfileId,
        setActiveProfileId,
        normalizeAttempt,
        reduceProgress,
        loadProgress,
        saveProgress,
        recordAttempt,
        exportProgressJson,
        importProgressJson,
        getFactStats
    };

    if (root && root.ACTIVE_PROFILE_ID === undefined) {
        root.ACTIVE_PROFILE_ID = DEFAULT_PROFILE_ID;
    }
    root.MathProgress = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
