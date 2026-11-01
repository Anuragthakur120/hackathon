import { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { api } from '../api/index.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { SearchBar } from '../components/SearchBar.jsx';
import { SchemeCard } from '../components/SchemeCard.jsx';

const CATEGORIES = [
  'All',
  'Pension',
  'Education',
  'Healthcare',
  'Housing',
  'Agriculture',
  'Employment',
  'Financial Assistance',
  'Social Welfare',
];

export function SchemesListScreen() {
  const { language } = useApp();

  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedState, setSelectedState] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function fetchSchemes() {
      try {
        setLoading(true);
        const res = await api.getSchemes({
          category: selectedCategory,
          state: selectedState,
          search: searchQuery,
          sort: sortBy,
          page: currentPage,
          limit: 8,
        });
        if (mounted) {
          setSchemes(res?.data?.schemes || []);
          setTotalCount(res?.data?.total || 0);
        }
      } catch (err) {
        console.error('Failed to load schemes:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSchemes();
    return () => {
      mounted = false;
    };
  }, [selectedCategory, selectedState, searchQuery, sortBy, currentPage]);

  return (
    <div className="w-full space-y-6" data-testid="schemes-list-screen">
      {/* Page Header */}
      <PageHeader
        title="All Government Schemes"
        subtitle="Explore state and central government welfare schemes, subsidies, pensions, and financial grants for eligible citizens."
        badge={`${totalCount} Available`}
        breadcrumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: 'Government Schemes' },
        ]}
      />

      {/* Filter and Search Bar Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <SearchBar
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              onClear={() => setSearchQuery('')}
              placeholder="Search by scheme name (e.g. Pension, Scholarship, PMAY, PM-KISAN)..."
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setCurrentPage(1);
              }}
              className="min-h-[48px] rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
            >
              <option value="All">All Regions</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="All India">All India (Central)</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="min-h-[48px] rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="newest">Sort: Newest</option>
            </select>
          </div>
        </div>

        {/* Category Horizontal Scroll Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'border border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Schemes Grid */}
      {loading ? (
        <div
          className="grid py-8"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : schemes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <span className="text-4xl">🔍</span>
          <h3 className="mt-2 text-base font-bold text-slate-800">No schemes found</h3>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search query or selecting a different category filter.
          </p>
        </div>
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          {schemes.map((scheme) => (
            <SchemeCard key={scheme.schemeId} scheme={scheme} language={language} />
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {totalCount > 8 ? (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500">
            Showing <span className="font-bold text-slate-800">{schemes.length}</span> of{' '}
            <span className="font-bold text-slate-800">{totalCount}</span> schemes
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-xs font-bold text-slate-800 px-2">{currentPage}</span>
            <button
              type="button"
              disabled={currentPage * 8 >= totalCount}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

