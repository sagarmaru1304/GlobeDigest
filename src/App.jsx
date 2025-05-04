import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaVolumeUp, FaGlobe, FaSun, FaMoon, FaSearch, FaTimes } from "react-icons/fa";

const categories = [
  "Top",
  "Technology",
  "Business",
  "Sports",
  "Entertainment",
  "Health",
  "Science",
  "Politics",
  "Climate",
  "Education",
  "World",
  "Travel",
  "Lifestyle",
  "Food",
  "AI",
  "Crypto"
];
const countries = [
  { code: "in", name: "India" },
  { code: "us", name: "USA" },
  { code: "gb", name: "UK" },
  { code: "au", name: "Australia" },
  { code: "ca", name: "Canada" },
];

const languages = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "es", name: "Spanish" },
];

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const NEWSDATA_API_KEY = import.meta.env.VITE_NEWSDATA_API_KEY;
const VOICERSS_KEY = import.meta.env.VITE_VOICERSS_API_KEY;

export default function App() {
  const [news, setNews] = useState([]);
  const [country, setCountry] = useState("in");
  const [language, setLanguage] = useState("en");
  const [category, setCategory] = useState("top");
  const [uiTheme, setUiTheme] = useState("light");
  const [search, setSearch] = useState("");
  const [nextPage, setNextPage] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", uiTheme === "dark");
  }, [uiTheme]);

  useEffect(() => {
    fetchNews(true);
  }, [country, language, category]);

  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) fetchNews(false);
    }, { threshold: 1.0 });

    const sentinel = document.getElementById("load-sentinel");
    if (sentinel) observer.observe(sentinel);

    return () => sentinel && observer.unobserve(sentinel);
  }, [hasMore, loading, nextPage]);

  const fetchNews = async (initial = false) => {
    setLoading(true);
    try {
      const pageParam = !initial && nextPage ? `&page=${nextPage}` : "";
      const qParam = search ? `&q=${encodeURIComponent(search)}` : "";
      const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&country=${country}&language=${language}&category=${category.toLowerCase()}${qParam}${pageParam}`;
      const res = await axios.get(url);

      const articles = res.data.results || [];
      const summarized = await batchSummarize(articles.map(a => a.description || a.content || "No content available"));

      const mapped = articles.map((a, i) => ({ ...a, summary: summarized[i], translatedSummary: null }));
      setNews(initial ? mapped : [...news, ...mapped]);
      setNextPage(res.data.nextPage);
      setHasMore(!!res.data.nextPage);
    } catch (e) {
      console.error("❌ News fetch failed:", e);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const batchSummarize = async (texts) => {
    if (!OPENAI_API_KEY || !texts.length) return texts.map(t => t.split(". ").slice(0, 2).join(". "));
    try {
      const prompt = texts.map((t, i) => `${i + 1}. ${t}`).join("\n\n");
      const res = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "Summarize each article in 2-3 lines and number them accordingly." },
            { role: "user", content: prompt },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      const result = res.data.choices[0].message.content;
      return texts.map((_, i) => result.split(/\n\d+\.\s/)[i + 1]?.trim() || texts[i]);
    } catch (err) {
      console.error("❌ OpenAI summarising failed:", err.message);
      return texts.map(t => t.split(". ").slice(0, 4).join(". "));
    }
  };

  const translateText = async (text, targetLang) => {
    try {
      const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`);
      return response.data.responseData.translatedText;
    } catch (err) {
      console.error("❌ Translation failed:", err.message);
      return text;
    }
  };

  const speak = (text) => {
    const audio = new Audio(`https://api.voicerss.org/?key=${VOICERSS_KEY}&hl=en-us&src=${encodeURIComponent(text)}`);
    audio.play();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearching(true);
    setNextPage(null);
    fetchNews(true);
  };

  const handleClear = () => {
    setSearch("");
    setNextPage(null);
    fetchNews(true);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 p-4 shadow flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">GlobeDigest</h1>
            <div className="flex flex-col">
              <p className="text-l text-gray-600 dark:text-gray-300 animate-pulse">
                Your smart, summarized and global news feed ✨
              </p>
            </div>
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full shadow-inner w-full max-w-lg mx-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search e.g. IPL, 'climate change'"
            className="flex-1 bg-transparent outline-none text-base"
          />
          {search && <button onClick={handleClear} className="text-gray-500 hover:text-red-500"><FaTimes /></button>}
          <button type="submit" className="text-blue-600"><FaSearch /></button>
        </form>
        <div className="flex gap-2 items-center">
          <select value={country} onChange={(e) => { setCountry(e.target.value); setNextPage(null); }} className="bg-transparent border p-1 rounded">
            {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <select value={language} onChange={(e) => { setLanguage(e.target.value); setNextPage(null); }} className="bg-transparent border p-1 rounded">
            {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
          <button onClick={() => setUiTheme(t => t === "dark" ? "light" : "dark")}>{uiTheme === "dark" ? <FaSun /> : <FaMoon />}</button>
        </div>
      </header>

      <div className="sticky top-[72px] z-40 bg-white dark:bg-gray-900 border-t border-b dark:border-gray-700 p-2 overflow-x-auto flex gap-4 scrollbar-thin scrollbar-thumb-blue-500">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setNextPage(null); }}
            className={`px-4 py-2 rounded-full font-semibold transition ${cat === category ? 'bg-blue-700 text-white shadow-md' : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-lg mt-6">Loading news...</p>}
      {searching && <p className="text-center text-sm text-blue-400">Searching for “{search}”...</p>}

      <main className="px-6 py-8">
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
        {news.map((article, i) => (
          <div key={i} className="break-inside-avoid p-4 rounded-xl shadow bg-gray-100 dark:bg-gray-800 space-y-2 hover:scale-[1.02] transition-transform duration-300">
            <h2 className="text-lg font-semibold">{article.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">{article.translatedSummary || article.summary}</p>
            <p className="text-xs text-gray-500">Source: {article.source_id || "Unknown"}</p>
            <div className="flex justify-between items-center">
              <button onClick={() => speak(article.translatedSummary || article.summary)} className="text-blue-600"><FaVolumeUp /></button>
              <select onChange={async (e) => {
                const translated = await translateText(article.summary, e.target.value);
                const updated = [...news];
                updated[i].translatedSummary = translated;
                setNews(updated);
              }} className="text-xs bg-transparent">
                <option value="">🌐 Translate</option>
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
              <a href={article.link} target="_blank" className="text-blue-600 text-sm">See full article</a>
            </div>
          </div>
        ))}
      </div>
</main>


      <div id="load-sentinel" className="h-10"></div>
    </div>
  );
}
