export interface Recommendation {
  title: string;
  topics: string;
  diff: "Easy" | "Medium" | "Hard";
  reason: string;
  slug: string;
}

const BANK: Recommendation[] = [
  {
    title: "Trapping Rain Water",
    topics: "Dynamic Programming · Two Pointers",
    diff: "Hard",
    reason: "Classic hard that interviews keep coming back to",
    slug: "trapping-rain-water",
  },
  {
    title: "LRU Cache",
    topics: "Design · Hash Table",
    diff: "Medium",
    reason: "Top design question across FAANG loops",
    slug: "lru-cache",
  },
  {
    title: "Word Ladder",
    topics: "BFS · Graph",
    diff: "Hard",
    reason: "Builds strong BFS state-space intuition",
    slug: "word-ladder",
  },
  {
    title: "Median of Two Sorted Arrays",
    topics: "Binary Search · Divide & Conquer",
    diff: "Hard",
    reason: "The binary-search partition trick everyone should know",
    slug: "median-of-two-sorted-arrays",
  },
  {
    title: "Minimum Window Substring",
    topics: "Sliding Window · Hash Table",
    diff: "Hard",
    reason: "The definitive sliding-window template",
    slug: "minimum-window-substring",
  },
  {
    title: "Number of Islands",
    topics: "DFS · Union Find",
    diff: "Medium",
    reason: "Grid traversal fundamentals, endlessly remixed",
    slug: "number-of-islands",
  },
  {
    title: "Course Schedule",
    topics: "Topological Sort · Graph",
    diff: "Medium",
    reason: "Cycle detection + topo sort in one problem",
    slug: "course-schedule",
  },
  {
    title: "Longest Increasing Subsequence",
    topics: "DP · Binary Search",
    diff: "Medium",
    reason: "Two canonical solutions worth mastering",
    slug: "longest-increasing-subsequence",
  },
  {
    title: "Serialize and Deserialize Binary Tree",
    topics: "Tree · Design",
    diff: "Hard",
    reason: "Tests tree traversal and encoding design",
    slug: "serialize-and-deserialize-binary-tree",
  },
  {
    title: "Sliding Window Maximum",
    topics: "Monotonic Queue",
    diff: "Hard",
    reason: "Monotonic deque pattern in its purest form",
    slug: "sliding-window-maximum",
  },
  {
    title: "Word Search II",
    topics: "Trie · Backtracking",
    diff: "Hard",
    reason: "Trie + DFS pruning, a favorite hard combo",
    slug: "word-search-ii",
  },
  {
    title: "Find Median from Data Stream",
    topics: "Two Heaps",
    diff: "Hard",
    reason: "The two-heap invariant, asked everywhere",
    slug: "find-median-from-data-stream",
  },
  {
    title: "Merge k Sorted Lists",
    topics: "Heap · Linked List",
    diff: "Hard",
    reason: "Heap-driven merging you will reuse constantly",
    slug: "merge-k-sorted-lists",
  },
  {
    title: "Edit Distance",
    topics: "Dynamic Programming",
    diff: "Medium",
    reason: "The 2D DP table blueprint",
    slug: "edit-distance",
  },
  {
    title: "N-Queens",
    topics: "Backtracking",
    diff: "Hard",
    reason: "Backtracking with pruning, straight from the textbook",
    slug: "n-queens",
  },
  {
    title: "Binary Tree Maximum Path Sum",
    topics: "Tree · DFS",
    diff: "Hard",
    reason: "Post-order accumulation trick worth drilling",
    slug: "binary-tree-maximum-path-sum",
  },
  {
    title: "Kth Largest Element in an Array",
    topics: "Quickselect · Heap",
    diff: "Medium",
    reason: "Quickselect vs heap trade-offs in one problem",
    slug: "kth-largest-element-in-an-array",
  },
  {
    title: "Longest Consecutive Sequence",
    topics: "Hash Set",
    diff: "Medium",
    reason: "O(n) hash-set insight interviewers love",
    slug: "longest-consecutive-sequence",
  },
];

export function recommend(count = 3): Recommendation[] {
  const pool = [...BANK];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
