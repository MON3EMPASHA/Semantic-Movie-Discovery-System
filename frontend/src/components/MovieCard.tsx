import type { MovieSummary } from "../types/movie";

interface Props {
  movie: MovieSummary;
  onSelect?: (movie: MovieSummary) => void;
  isActive?: boolean;
}

export const MovieCard = ({ movie, onSelect, isActive }: Props) => (
  <button
    type="button"
    onClick={() => onSelect?.(movie)}
    className={`flex flex-col rounded-xl border bg-white/5 p-4 text-left shadow transition hover:-translate-y-0.5 hover:shadow-lg ${
      isActive ? "border-emerald-400" : "border-white/10"
    }`}
  >
    <div className="mb-3 h-64 w-full overflow-hidden rounded-lg bg-slate-800">
      {movie.posterGridFSId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`http://localhost:4000/api/movies/${movie.id}/poster`}
          alt={`${movie.title} poster`}
          className="h-full w-full object-cover"
        />
      ) : movie.posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={movie.posterUrl}
          alt={`${movie.title} poster`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
          Poster unavailable
        </div>
      )}
    </div>
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-lg font-semibold text-white">{movie.title}</p>
        {typeof movie.rating === "number" && (
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
            {movie.rating.toFixed(1)}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-300">
        {[movie.releaseYear, movie.genres?.slice(0, 2).join(" • ")]
          .filter(Boolean)
          .join(" • ")}
      </p>
      {movie.cast?.length > 0 && (
        <p className="text-xs text-slate-400">
          Cast: {movie.cast.slice(0, 3).join(", ")}
        </p>
      )}
      {typeof movie.score === "number" && (
        <p className="text-xs text-slate-500">
          Semantic score: {movie.score.toFixed(3)}
        </p>
      )}
    </div>
  </button>
);
