export const translations = {
    en: {
        dashboard: "Dashboard",
        live_tracking: "Live Tracking",
        eta: "ETA",
        distance: "Distance",
        stops: "Stops",
        attendance: "Attendance",
        start_shift: "Start Shift",
        end_shift: "End Shift",
        sos: "Send SOS",
        ai_status: "AI Core Status"
    },
    ta: {
        dashboard: "தகவல் பலகை",
        live_tracking: "நேரடி கண்காணிப்பு",
        eta: "வருகை நேரம்",
        distance: "தூரம்",
        stops: "நிறுத்தங்கள்",
        attendance: "வருகை",
        start_shift: "பணியைத் தொடங்கு",
        end_shift: "பணியை முடி",
        sos: "அவசர உதவி",
        ai_status: "AI நிலை"
    }
};

export const getTranslation = (lang, key) => {
    return translations[lang]?.[key] || translations['en'][key] || key;
};
