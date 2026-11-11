1. **Fix `onChange` handlers for React state updates to avoid excessive Chrome storage API calls**
   - Use the `replace_with_git_merge_diff` tool to modify `apps/extension/entrypoints/sidepanel/main.tsx`.
   - Add `useRef` for tracking `isDirtyRef` and `pendingRef` state.
   - For Provider Settings, replace direct `saveProvider` on `onChange` to updating local state and updating `pendingRef`. Add an `onBlur` that calls `saveProvider` async. Add the `visibilitychange` listener to flush the state synchronously to clear dirty/pending and then do async storage writes.
   - For Profile Email, replace direct `setProfile` on `onChange` to updating local state. Save to `chrome.storage` via `setProfile` on `onBlur`. Include logic to flush unsaved profile changes on `visibilitychange`.
   - Update `refresh` function to make sure that initial asynchronous data doesn't overwrite un-saved user input by checking `isDirtyRef`.
2. **Verify edits to `main.tsx`**
   - Use the `run_in_bash_session` tool to run `grep -n -C 5 'onBlur' apps/extension/entrypoints/sidepanel/main.tsx` to verify the changes were written correctly.
3. **Regression testing**
   - Use the `run_in_bash_session` tool to check for regressions by running `npm run build -w @inspra/extension`, followed by `npm run typecheck -ws --if-present` and `npm test -ws --if-present`.
4. **Include pre-commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
5. **Submit the PR**
   - Submit the focused PR for the storage call safety fix.
