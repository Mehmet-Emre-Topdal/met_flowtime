import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAppDispatch } from "@/hooks/storeHooks";
import { setUser, setLoading } from "@/features/auth/slices/authSlice";
import { UserDto } from "@/types/auth";

export const useAuthInit = () => {
    const dispatch = useAppDispatch();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const userDto: UserDto = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                };
                dispatch(setUser(userDto));
            } else {
                dispatch(setUser(null));
            }
            dispatch(setLoading(false));
        });

        return () => unsubscribe();
    }, [dispatch]);
};
