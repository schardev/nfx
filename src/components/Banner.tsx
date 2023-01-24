import {
  Check,
  InfoEmpty,
  PlayOutline,
  Plus,
  SoundHigh,
  SoundOff,
} from "iconoir-react";
import { PropsWithChildren, useRef, useState } from "react";
import type ReactPlayer from "react-player";
import { useNavigate } from "react-router-dom";
import { ModalCategory, useModalDispatcher } from "../contexts/ModalContext";
import { useMyListData, useMyListDispatcher } from "../contexts/MyListProvider";
import useFetch from "../hooks/useFetch";
import useMediaQuery from "../hooks/useMediaQuery";
import { api } from "../lib/tmdb";
import styles from "../styles/banner.module.scss";
import type {
  CustomURLSearchParams,
  Images,
  MovieDetails,
  TVDetails,
  Videos,
} from "../types/tmdb";
import { j } from "../utils";
import ShimmerImg from "./ShimmerImg";
import YouTubeIFrame from "./YouTubeIFrame";

type BannerState =
  | ((MovieDetails | TVDetails) & { images: Images; videos: Videos })
  | null;

const BannerShimmer = () => {
  return (
    <div className={j(styles["banner-shimmer"], "shimmer")}>
      <div className="shimmer"></div>
      <div className="shimmer"></div>
    </div>
  );
};

const Banner = ({
  endpoint,
  params = {},
}: PropsWithChildren<{ endpoint: string; params?: CustomURLSearchParams }>) => {
  const searchParams = new URLSearchParams(params as any);

  let category: Category;
  if (endpoint.includes("movie")) {
    category = "movie";
  } else if (endpoint.includes("tv")) {
    category = "tv";
  } else {
    throw new Error("Unknown endpoint!");
  }

  const myList = useMyListData();
  const dispatchToList = useMyListDispatcher();
  const setModalState = useModalDispatcher();
  const navigate = useNavigate();
  const matches = useMediaQuery("tablet-up");
  const [muted, setIsMuted] = useState(true);
  const playerRef = useRef<ReactPlayer>(null);
  const { isLoading, data, error } = useFetch<BannerState>(
    `${endpoint}/${searchParams}/banner`,
    async ({ signal }) => {
      const defaultParams = {
        language: "en",
        append_to_response: "images,videos",
      };

      let res = await api.makeRequest(endpoint, {
        query: params,
        init: { signal },
      });

      let randomItemId =
        res.results[Math.floor(Math.random() * res.results.length)].id;

      let item = await api.makeRequest(`${category}/${randomItemId}`, {
        query: {
          ...defaultParams,
          ...params,
        },
        init: { signal },
      });

      return item;
    }
  );

  if (error) {
    console.error(error);
    return null;
  }

  if (!data || isLoading) return <BannerShimmer />;

  let title: string;
  if (category === "movie") {
    title = (data as MovieDetails).title!;
  } else {
    title = (data as TVDetails).name!;
  }

  let logoPath: string | null = null;
  if (data?.images.logos && data.images.logos[0]) {
    logoPath = data.images.logos[0].file_path!;
  }

  const isInList = myList.some((item) => {
    if (item.id === data.id! && category === item.media_type) {
      return true;
    }
    return false;
  });

  let videos = data.videos.results!.length >= 1 ? data.videos?.results : null;
  videos = null; // TEMP TODO, aslo use a sliht delay to show banner video

  return (
    <div className={styles["banner-container"]}>
      {matches && videos ? (
        <div className={styles["player"]}>
          <YouTubeIFrame
            ref={playerRef}
            videoKey={videos[0].key}
            playing={true}
            loop={true}
            muted={muted}
            onError={() => {
              console.log("error playing video");
            }}
          />
          <div
            className={styles["player-control"]}
            onClick={() => setIsMuted(!muted)}>
            {muted ? <SoundOff /> : <SoundHigh />}
          </div>
        </div>
      ) : (
        <div className={j(styles["banner-img"])}>
          <ShimmerImg
            className={styles["banner-img__backdrop"]}
            src={api.getBackdropURL(data.backdrop_path, "w1280")}
            alt={(data as any).title || (data as any).name}
          />
        </div>
      )}
      <div className={styles["banner-info"]}>
        {logoPath ? (
          <img
            className={styles["banner-info__logo"]}
            src={api.getLogoURL(logoPath)}
            alt=""
          />
        ) : (
          <h1>{title}</h1>
        )}
        {matches ? (
          <p>{data.overview}</p>
        ) : (
          <ul className={styles["banner-info__genre"]}>
            {data.genres?.map((genre) => (
              <li key={genre.id}>
                <span>{genre.name}</span>
              </li>
            ))}
          </ul>
        )}
        <ul className={styles["banner-menu"]}>
          {!matches && (
            <li>
              <button
                onClick={() => {
                  dispatchToList({
                    type: "add",
                    payload: {
                      id: data.id!,
                      media_type: category,
                      poster_path: api.getPosterURL(data.poster_path),
                    },
                  });
                }}>
                {isInList ? <Check /> : <Plus />}
                <span>My List</span>
              </button>
            </li>
          )}
          <li>
            <button
              className={styles["play-btn"]}
              onClick={() => navigate(`/${category}/${data.id}`)}>
              <PlayOutline />
              <span>Play</span>
            </button>
          </li>
          <li>
            <button
              onClick={() =>
                setModalState({
                  visible: true,
                  id: data.id!,
                  category: category as ModalCategory,
                  expanded: true
                })
              }>
              <InfoEmpty />
              <span>{matches ? "More Info" : "Info"}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Banner;
