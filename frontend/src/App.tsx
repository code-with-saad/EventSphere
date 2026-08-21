import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TestDesignTokens } from './components/TestDesignTokens';

function Home() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>EventSphere - Home</h1>
      <p>Welcome to EventSphere Frontend</p>
      <nav>
        <Link to="/about">Go to About</Link> | <Link to="/design-test">Design Tokens Test</Link>
      </nav>
    </div>
  );
}

function About() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>About EventSphere</h1>
      <p>This is the about page</p>
      <nav>
        <Link to="/">Go to Home</Link>
      </nav>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/design-test" element={<TestDesignTokens />} />
      </Routes>
    </Router>
  );
}

export default App;
