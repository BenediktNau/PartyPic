import { useMutation } from '@tanstack/react-query';
import axios from 'axios'; // Oder dein konfigurierter API-Client
import { useAuth } from '../../auth.context';

// Typen für die API-Antworten (optional, aber empfohlen)
interface AuthResponse {
    access_token: string;
    user: any; // Definiere, wie dein 'user'-Objekt aussieht
}


interface RegisterData {
    email: string;
    password: string;
    username: string;
}

interface LoginData {
    email: string;
    password: string;
}

export const useLogin = () => {
    const { setAuthData } = useAuth();

    return useMutation<AuthResponse, Error, LoginData>({
        mutationFn: (loginData) =>
            axios.post('/auth/login', loginData)
                .then(res => res.data),
        
        onSuccess: (data) => {
            setAuthData({ token: data.access_token, user: data.user });
        },
        onError: (error) => {
            console.error("Login fehlgeschlagen:", error);
        }
    });
};

export const useRegister = () => {
    return useMutation<any, Error, RegisterData>({
        mutationFn: (registerData) =>
            axios.post('/auth/register', registerData)
                .then(res => res.data),

        onSuccess: () => {
            console.log("Registrierung erfolgreich! Bitte einloggen.");
        },
        onError: (error) => {
            console.error("Registrierung fehlgeschlagen:", error);
        }
    });
};