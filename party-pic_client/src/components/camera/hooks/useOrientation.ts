import { useState, useEffect } from 'react';

type Orientation = 'portrait' | 'landscape';

function getOrientation(): Orientation {
    if (typeof window === 'undefined') {
        return 'landscape';
    }
    // window.screen.orientation.type ist der moderne Weg
    if (window.screen.orientation && window.screen.orientation.type) {
        return window.screen.orientation.type.startsWith('portrait')
            ? 'portrait'
            : 'landscape';
    }

    // Fallback für ältere Browser
    return window.matchMedia("(orientation: portrait)").matches
        ? 'portrait'
        : 'landscape';
}

export function useOrientation(): Orientation {
    const [orientation, setOrientation] = useState<Orientation>(getOrientation());

    useEffect(() => {
        function handleOrientationChange() {
            setOrientation(getOrientation());
        }

        // Moderne API
        const orientationApi = window.screen.orientation;
        if (orientationApi && orientationApi.addEventListener) {
            orientationApi.addEventListener('change', handleOrientationChange);
            return () => orientationApi.removeEventListener('change', handleOrientationChange);
        }

        // Fallback-Listener
        window.addEventListener('resize', handleOrientationChange);
        return () => {
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, []);

    return orientation;
}