export function hasExternalMutation(mutations, previewRoot) {
    return mutations.some(({ target }) => !previewRoot?.contains(target));
}
