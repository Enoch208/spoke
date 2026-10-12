import { mutationHook, queryHook } from "../use-client";

export const useProductsList = queryHook("products.list");
export const useProductsGet = queryHook("products.get");
export const useProductsSaveMutation = mutationHook("products.save", ["products", "campaigns"]);
export const useProductsUploadAssetMutation = mutationHook("products.uploadAsset", ["products"]);
export const useProductsCategories = queryHook("products.categories");
