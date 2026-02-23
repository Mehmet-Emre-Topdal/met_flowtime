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

        loginWithGoogle: builder.mutation<UserDto, void>({
            queryFn: async () => {
                try {
                    const result = await signInWithPopup(auth, googleProvider);
                    const user = result.user;
                    return {
                        data: {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                        },
                    };
                } catch (error) {
                    return { error: { status: "CUSTOM_ERROR", error: String(error) } };
                }
            },
        }),

        loginWithEmail: builder.mutation<UserDto, { email: string; password: string }>({
            queryFn: async ({ email, password }) => {
                try {
                    const result = await signInWithEmailAndPassword(auth, email, password);
                    const user = result.user;
                    return {
                        data: {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                        },
                    };
                } catch (error) {
                    const code = (error as { code?: string }).code;
                    const messages: Record<string, string> = {
                        "auth/user-not-found": "No account found with this email.",
                        "auth/wrong-password": "Invalid email or password.",
                        "auth/invalid-credential": "Invalid email or password.",
                        "auth/too-many-requests": "Too many attempts. Please try again later.",
                        "auth/invalid-email": "Invalid email address.",
                    };
                    return { error: { status: "CUSTOM_ERROR", error: messages[code ?? ""] ?? "Login failed." } };
                }
            },
        }),

        registerWithEmail: builder.mutation<UserDto, { email: string; password: string; displayName: string }>({
            queryFn: async ({ email, password, displayName }) => {
                try {
                    const result = await createUserWithEmailAndPassword(auth, email, password);
                    await updateProfile(result.user, { displayName });
                    const user = result.user;
                    return {
                        data: {
                            uid: user.uid,
                            email: user.email,
                            displayName,
                            photoURL: user.photoURL,
                        },
                    };
                } catch (error) {
                    const code = (error as { code?: string }).code;
                    const messages: Record<string, string> = {
                        "auth/email-already-in-use": "This email is already registered.",
                        "auth/weak-password": "Password must be at least 6 characters.",
                        "auth/invalid-email": "Invalid email address.",
                    };
                    return { error: { status: "CUSTOM_ERROR", error: messages[code ?? ""] ?? "Registration failed." } };
                }
            },
        }),

        logout: builder.mutation<void, void>({
            queryFn: async () => {
                try {
                    await signOut(auth);
                    return { data: undefined };
                } catch (error) {
                    return { error: { status: "CUSTOM_ERROR", error: String(error) } };
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
