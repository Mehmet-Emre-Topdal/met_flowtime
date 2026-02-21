import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface TaskState {
    selectedTaskId: string | null;
}

const initialState: TaskState = {
    selectedTaskId: null,
};

const taskSlice = createSlice({
    name: "task",
    initialState,
    reducers: {
        setSelectedTaskId: (state, action: PayloadAction<string | null>) => {
            state.selectedTaskId = action.payload;
        },
        resetTask: (state) => {
            state.selectedTaskId = null;
        }
    },
});

export const { setSelectedTaskId, resetTask } = taskSlice.actions;
export default taskSlice.reducer;
