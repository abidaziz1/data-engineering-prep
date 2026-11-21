-- One row for each line of an order. dlt put the lines of the list in a child table, linked to its parent by _dlt_parent_id.
select
    o.id          as order_id,
    l._dlt_list_idx as line_no,
    l.sku,
    l.qty
from {{ source('raw', 'orders__lines') }} l
join {{ source('raw', 'orders') }} o on l._dlt_parent_id = o._dlt_id
