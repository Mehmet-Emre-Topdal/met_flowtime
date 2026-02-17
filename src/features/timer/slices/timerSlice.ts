import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { UserConfig, DEFAULT_CONFIG } from "@/types/config";

interface TimerState {
    config: UserConfig;
}

const initialState: TimerState = {
    config: DEFAULT_CONFIG,
};

const timerSlice = createSlice({
    name: "timer",
    initialState,
    reducers: {
        updateConfig: (state, action: PayloadAction<UserConfig>) => {
            state.config = action.payload;
        },
    },
});

export const { updateConfig } = timerSlice.actions;
export default timerSlice.reducer;
