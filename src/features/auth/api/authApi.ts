import { baseApi } from "@/store/api/baseApi";
import { auth, googleProvider } from "@/lib/firebase";
import {
    signInWithPopup,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
} from "firebase/auth";
import { UserDto } from "@/types/auth";

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        /* ─── Google ile Giriş ─── */
        loginWithGoogle: builder.mutation<UserDto, void>({
            queryFn: async () => {
                try {
                    const result = await signInWithPopup(auth, googleProvider);
                    const user = result.user;
                    const userDto: UserDto = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                    };
                    return { data: userDto };
                } catch (error: any) {
                    return { error: { status: "CUSTOM_ERROR", error: error.message } };
                }
            },
        }),

        /* ─── Email/Şifre ile Giriş ─── */
        loginWithEmail: builder.mutation<UserDto, { email: string; password: string }>({
            queryFn: async ({ email, password }) => {
                try {
                    const result = await signInWithEmailAndPassword(auth, email, password);
                    const user = result.user;
                    const userDto: UserDto = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                    };
                    return { data: userDto };
                } catch (error: any) {
                    let message = "Login failed.";
                    switch (error.code) {
                        case "auth/user-not-found":
                            message = "No account found with this email.";
                            break;
                        case "auth/wrong-password":
                        case "auth/invalid-credential":
                            message = "Invalid email or password.";
                            break;
                        case "auth/too-many-requests":
                            message = "Too many attempts. Please try again later.";
                            break;
                        case "auth/invalid-email":
                            message = "Invalid email address.";
                            break;
                    }
                    return { error: { status: "CUSTOM_ERROR", error: message } };
                }
            },
        }),

        /* ─── Email/Şifre ile Kayıt ─── */
        registerWithEmail: builder.mutation<UserDto, { email: string; password: string; displayName: string }>({
            queryFn: async ({ email, password, displayName }) => {
                try {
                    const result = await createUserWithEmailAndPassword(auth, email, password);
                    // Kullanıcı adını güncelle
                    await updateProfile(result.user, { displayName });
                    const user = result.user;
                    const userDto: UserDto = {
                        uid: user.uid,
                        email: user.email,
                        displayName: displayName,
                        photoURL: user.photoURL,
                    };
                    return { data: userDto };
                } catch (error: any) {
                    let message = "Registration failed.";
                    switch (error.code) {
                        case "auth/email-already-in-use":
                            message = "This email is already registered.";
                            break;
                        case "auth/weak-password":
                            message = "Password must be at least 6 characters.";
                            break;
                        case "auth/invalid-email":
                            message = "Invalid email address.";
                            break;
                    }
                    return { error: { status: "CUSTOM_ERROR", error: message } };
                }
            },
        }),

        /* ─── Çıkış ─── */
        logout: builder.mutation<void, void>({
            queryFn: async () => {
                try {
                    await signOut(auth);
                    return { data: undefined };
                } catch (error: any) {
                    return { error: { status: "CUSTOM_ERROR", error: error.message } };
                }
            },
        }),
    }),
});

export const {
    useLoginWithGoogleMutation,
    useLoginWithEmailMutation,
    useRegisterWithEmailMutation,
    useLogoutMutation,
} = authApi;
