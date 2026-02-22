export async function copyTextToClipboard(value: string): Promise<void> {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(value);
        return;
    }

    if (typeof document === "undefined") {
        throw new Error("Clipboard API unavailable");
    }

    const fallbackInput = document.createElement("textarea");
    fallbackInput.value = value;
    fallbackInput.setAttribute("readonly", "true");
    fallbackInput.style.position = "fixed";
    fallbackInput.style.opacity = "0";
    fallbackInput.style.left = "-9999px";
    document.body.appendChild(fallbackInput);
    fallbackInput.select();
    const success = document.execCommand("copy");
    document.body.removeChild(fallbackInput);
    if (!success) {
        throw new Error("Copy command failed");
    }
}
