import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { UserConfig, DEFAULT_CONFIG } from "@/types/config";

interface TimerState {
    config: UserConfig;
    isLoadedFromFirebase: boolean;
}

const initialState: TimerState = {
    config: DEFAULT_CONFIG,
    isLoadedFromFirebase: false,
};

const timerSlice = createSlice({
    name: "timer",
    initialState,
    reducers: {
        updateConfig: (state, action: PayloadAction<UserConfig>) => {
            state.config = action.payload;
        },
        setLoadedFromFirebase: (state, action: PayloadAction<boolean>) => {
            state.isLoadedFromFirebase = action.payload;
        }
    },
});

export const { updateConfig, setLoadedFromFirebase } = timerSlice.actions;
export default timerSlice.reducer;
