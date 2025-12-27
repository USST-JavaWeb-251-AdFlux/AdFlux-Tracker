import { request, type ApiResponse } from './request';

export const initPageViewApi = (body: {
    domain: string;
    categoryName: string;
    trackId: string;
}) => {
    return request<
        ApiResponse<{
            visitId: string;
        }>
    >('/track/page-view', {
        method: 'POST',
        body,
    });
};

export const updatePageViewApi = (body: { visitId: string; duration: number }) => {
    return request<ApiResponse<boolean>>('/track/page-view', {
        method: 'PUT',
        body,
    });
};
