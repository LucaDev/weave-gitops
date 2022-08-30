import { useContext } from "react";
import { useQuery } from "react-query";
import { FluxObjectKind } from "../lib/api/core/types.pb";
import { CoreClientContext } from "../contexts/CoreClientContext";
import { Kind, Source } from "../lib/objects";
import { addKind } from "../lib/utils";
import { ListObjectsResponse } from "../lib/api/core/core.pb";
import {
  ReactQueryOptions,
  NoNamespace,
  RequestError,
  MultiRequestError,
} from "../lib/types";
import { convertResponse } from "./objects";

type Res = { result: Source[]; errors: MultiRequestError[] };

export function useListSources(
  appName?: string,
  namespace: string = NoNamespace,
  opts: ReactQueryOptions<Res, RequestError> = {
    retry: false,
    refetchInterval: 5000,
  }
) {
  const { api } = useContext(CoreClientContext);

  return useQuery<Res, RequestError>(
    ["sources", namespace],
    () => {
      const p = [
        Kind.GitRepository,
        Kind.HelmRepository,
        Kind.Bucket,
        Kind.HelmChart,
        Kind.OCIRepository,
      ].map((kind) =>
        api
          .ListObjects({ namespace, kind })
          .then((response: ListObjectsResponse) => {
            return { kind, response };
          })
      );
      return Promise.all(p).then((responses) => {
        const empty = { result: [], errors: [] };
        return responses.reduce((final, { kind, response }) => {
          final.result = final.result.concat(
            response.objects.map((o) => convertResponse(kind, o) as Source)
          );
          if (response.errors.length) {
            final.errors = final.errors.concat({
              ...response.errors,
              kind: FluxObjectKind[addKind(kind)],
            });
          }
          return final;
        }, empty);
      });
    },
    opts
  );
}
