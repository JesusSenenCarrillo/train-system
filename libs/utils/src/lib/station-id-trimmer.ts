export const trimStationId = (id: string | null): string | null => {
   if (!!id) {
       return id.charAt(0) === '0' ? id.substring(1) : id;
   }
   return id
}