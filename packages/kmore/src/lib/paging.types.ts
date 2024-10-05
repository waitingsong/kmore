
export interface PagingOptions {
  /**
   * @default true
   */
  enable: boolean
  /**
   * Current page number, start from 1
   * @default 1
   */
  page: number
  /**
   * @default 10
   */
  pageSize: number

  /**
   * @default false
   */
  wrapOutput?: boolean
}

/**
 * Note: keyof PagingMeta is not enumerable
 */
export type PageRawType<T = unknown> = T[] & PagingMeta
export interface PageWrapType<T = unknown> extends PagingMeta { rows: T[] }

export interface PagingMeta {
  /**
   * Total count of rows in table
   *
   * @note This is the number of query response rows,
   *  not the number of rows in the current page,
   *  also not the number of pages.
   */
  total: bigint
  /**
   * Current page number, start from 1
   */
  page: number
  /**
   * Number of rows of each page.
   * The number rows of the last page may be less than this value
   */
  pageSize: number
}


// #region inner


/**
 * - 0: No paging
 * - 1: Paging, PagingMeta on response Array
 * - 2: paging, wrap response as `PageWrapType`
 */
export type PagingCategory = 0 | 1 | 2

export type CalcPagingCat<T> = T extends true ? 2 : 1

export type AddPagingMeta<
  TSelection,
  EnablePaging extends PagingCategory = 0,
> = EnablePaging extends 0
  ? TSelection
  : TSelection extends (infer R)[]
    ? EnablePaging extends 2
      ? WrapPageOutput<R>
      : PageRawType<R>
    : TSelection

// type RemovePagingMeta<T> = T extends ((infer M)[] & PagingMeta) ? M[] : T
type WrapPageOutput<T> = T extends PageWrapType ? T : PageWrapType<T>


