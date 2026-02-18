import logo from "./assets/hearthswipe-logo.png";

export default function App() {
    return (
        <div className="app">
            <main className="hero">
                <img className="logo" src={logo} alt="HearthSwipe logo" />
                <p>Swipe Hearthstone cards. Get judged.</p>
            </main>
        </div>
    );
}
