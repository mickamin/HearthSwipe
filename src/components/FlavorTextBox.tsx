import { type ReactNode, useLayoutEffect, useRef } from "react";

const FLAVOR_FONT_MAX_PX = 14;
const FLAVOR_FONT_MIN_PX = 9;
const FLAVOR_FONT_STEP_PX = 0.5;

function renderFlavorText(flavor?: string): ReactNode {
    if (!flavor) {
        return "No flavor text.";
    }

    const tokens = flavor.split(/(<\/?(?:i|b)>|<br\s*\/?>)/gi);
    let italic = false;
    let bold = false;
    const parts: ReactNode[] = [];

    tokens.forEach((token, index) => {
        if (!token) {
            return;
        }
        if (/^<i>$/i.test(token)) {
            italic = true;
            return;
        }
        if (/^<\/i>$/i.test(token)) {
            italic = false;
            return;
        }
        if (/^<b>$/i.test(token)) {
            bold = true;
            return;
        }
        if (/^<\/b>$/i.test(token)) {
            bold = false;
            return;
        }
        if (/^<br\s*\/?>$/i.test(token)) {
            parts.push(<br key={`flavor-br-${index}`} />);
            return;
        }

        const text = token.replace(/<[^>]+>/g, "");
        if (!text) {
            return;
        }

        let content: ReactNode = text;
        if (italic) {
            content = <em>{content}</em>;
        }
        if (bold) {
            content = <strong>{content}</strong>;
        }

        parts.push(<span key={`flavor-${index}`}>{content}</span>);
    });

    const fallback = flavor.replace(/<[^>]+>/g, "").trim();
    return parts.length > 0 ? parts : fallback || "No flavor text.";
}

export function FlavorTextBox({ flavor }: { flavor?: string }) {
    const textRef = useRef<HTMLParagraphElement | null>(null);

    useLayoutEffect(() => {
        let raf = 0;
        const text = textRef.current;
        if (!text) {
            return;
        }

        const fitText = () => {
            const node = textRef.current;
            if (!node) {
                return;
            }

            let size = FLAVOR_FONT_MAX_PX;
            node.style.setProperty("--flavor-font-size", `${size}px`);

            while (
                size > FLAVOR_FONT_MIN_PX &&
                (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth)
            ) {
                size -= FLAVOR_FONT_STEP_PX;
                node.style.setProperty("--flavor-font-size", `${size}px`);
            }
        };

        const scheduleFit = () => {
            window.cancelAnimationFrame(raf);
            raf = window.requestAnimationFrame(fitText);
        };

        scheduleFit();
        window.addEventListener("resize", scheduleFit);

        let observer: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver(scheduleFit);
            if (text.parentElement) {
                observer.observe(text.parentElement);
            }
        }

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener("resize", scheduleFit);
            observer?.disconnect();
        };
    }, [flavor]);

    return (
        <div className="card-flavor-box">
            <p ref={textRef} className="card-flavor">
                {renderFlavorText(flavor)}
            </p>
        </div>
    );
}
